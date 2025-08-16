import { simpleGit, SimpleGit, LogResult, DiffResult } from 'simple-git';
import { storage } from '../storage-mongo';
import type { Repository, Commit } from '@shared/schema';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  timestamp: Date;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  filePaths: string[];
  fileTypes: string[];
  changeTypes: string[];
}

export class GitAnalyzer {
  private git: SimpleGit;
  private repoPath: string;

  constructor() {
    this.repoPath = '';
  }

  async cloneRepository(repo: Repository): Promise<string> {
    // Validate repository data
    if (!repo.url || repo.url.trim() === '') {
      throw new Error('Repository URL is empty or invalid');
    }
    const repoId = repo._id || repo.id;
    if (!repoId || repoId.trim() === '') {
      throw new Error('Repository ID is empty or invalid');
    }
    
    const baseDir = path.join(tmpdir(), 'codebase-analysis');
    const tempDir = path.join(baseDir, repoId);
    
    try {
      // Create base directory
      await fs.mkdir(baseDir, { recursive: true });
      
      // Remove existing directory if it exists
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, continue
      }
      
      // Clone repository with full history - ensure we get ALL commits
      this.git = simpleGit({
        binary: 'git'
      });
      console.log(`Cloning URL: "${repo.url}" to directory: ${tempDir}`);
      console.log(`Repository data:`, JSON.stringify(repo, null, 2));
      
      // Clone with explicit full history
      await this.git.clone(repo.url, tempDir, ['--no-single-branch']);
      
      // Switch to cloned repository
      this.git = simpleGit({
        baseDir: tempDir,
        binary: 'git'
      });
      this.repoPath = tempDir;
      
      // Check what branches we have
      const branches = await this.git.branch(['-a']);
      console.log('Available branches after clone:', Object.keys(branches.branches));
      
      // Make sure we're on master/main branch and fetch all refs
      try {
        await this.git.fetch(['origin']);
        await this.git.checkout('master');
        console.log('Switched to master branch');
      } catch (masterError) {
        try {
          await this.git.checkout('main');
          console.log('Switched to main branch');
        } catch (mainError) {
          console.warn('Could not switch to master or main branch, using default');
        }
      }

      return tempDir;
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  async analyzeCommits(repositoryId: string): Promise<CommitInfo[]> {
    if (!this.git) {
      throw new Error('Repository not cloned');
    }

    try {
      // Get all commits - try different approaches to get complete history
      console.log('Getting commit log from repository...');
      
      // First try to get branches info
      const branches = await this.git.branch(['-r']);
      console.log('Remote branches:', Object.keys(branches.branches));
      
      // Try getting commits from the current branch first, then all branches
      let log: LogResult;
      try {
        // Get full commit information - include ALL commits
        log = await this.git.log([]);
        console.log(`Found ${log.all.length} commits on current branch`);
        
        // If we only get 1 commit, try getting from all branches/refs
        if (log.all.length <= 1) {
          console.log('Trying to get commits from all refs...');
          log = await this.git.log(['--all']);
          console.log(`Found ${log.all.length} commits across all refs`);
        }
      } catch (error) {
        console.warn('Failed to get commit log:', error.message);
        // Try a simpler approach if the above fails
        try {
          log = await this.git.log([]);
          console.log(`Fallback: Found ${log.all.length} commits`);
        } catch (fallbackError) {
          console.error('All Git log attempts failed:', fallbackError.message);
          log = { all: [] } as LogResult;
        }
      }
      
      const commits: CommitInfo[] = [];
      
      console.log(`Processing ${log.all.length} commits from Git log`);
      
      for (const commit of log.all) {
        try {
          let filePaths: string[] = [];
          let filesChanged = 0;
          let linesAdded = 0;
          let linesRemoved = 0;

          try {
            // Get detailed commit info with stats
            const diffSummary = await this.git.diffSummary([`${commit.hash}^`, commit.hash]);
            filePaths = diffSummary.files.map(file => file.file);
            filesChanged = diffSummary.files.length;
            linesAdded = diffSummary.insertions;
            linesRemoved = diffSummary.deletions;
          } catch (diffError) {
            // Handle initial commit or commits without parents
            try {
              // For initial commit or E2BIG errors, try different approaches
              try {
                // Try simpler show command first
                const showResult = await this.git.show([commit.hash, '--name-only', '--pretty=format:']);
                filePaths = showResult.split('\n').filter(f => f.trim());
                filesChanged = filePaths.length;
              } catch (showError) {
                // If show fails, try ls-tree for the commit
                try {
                  const lsResult = await this.git.raw(['ls-tree', '-r', '--name-only', commit.hash]);
                  filePaths = lsResult.split('\n').filter(f => f.trim());
                  filesChanged = filePaths.length;
                } catch (lsError) {
                  console.warn(`Could not get file info for commit ${commit.hash.substring(0,8)}: ${showError.message}`);
                  filePaths = [];
                  filesChanged = 0;
                }
              }
              linesAdded = 0; // Can't calculate for initial commits  
              linesRemoved = 0;
            } catch (error) {
              console.warn(`Could not process files for commit ${commit.hash.substring(0,8)}: ${error.message}`);
              filePaths = [];
              filesChanged = 0;
              linesAdded = 0;
              linesRemoved = 0;
            }
          }
          
          // Extract file types for semantic analysis
          const fileTypes = filePaths.map(path => {
            const ext = path.split('.').pop()?.toLowerCase() || '';
            return ext;
          });
          
          // Determine change types based on file patterns
          const changeTypes = this.categorizeChanges(filePaths, commit.message);
          
          console.log(`Processing commit ${commit.hash.substring(0,8)}: "${commit.message.substring(0,50)}..." (${filesChanged} files)`);
          
          // Handle date parsing safely
          let timestamp: Date;
          try {
            timestamp = new Date(commit.date);
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date(); // fallback to current date
            }
          } catch {
            timestamp = new Date(); // fallback to current date
          }

          commits.push({
            sha: commit.hash,
            message: commit.message || '',
            author: commit.author_name || 'Unknown',
            authorEmail: commit.author_email || 'unknown@email.com',
            timestamp,
            filesChanged,
            linesAdded,
            linesRemoved,
            filePaths,
            fileTypes,
            changeTypes,
          });
        } catch (error) {
          console.error(`Failed to process commit ${commit.hash.substring(0,8)}: ${error.message}`);
          console.error('Commit data:', {
            hash: commit.hash,
            message: commit.message,
            author_name: commit.author_name,
            author_email: commit.author_email,
            date: commit.date
          });
        }
      }

      // Store commits in database
      const commitRecords: Omit<Commit, '_id'>[] = commits.map(commit => ({
        repositoryId,
        sha: commit.sha,
        message: commit.message,
        author: commit.author,
        authorEmail: commit.authorEmail,
        timestamp: commit.timestamp,
        filesChanged: commit.filesChanged,
        linesAdded: commit.linesAdded,
        linesRemoved: commit.linesRemoved,
        filePaths: commit.filePaths,
        fileTypes: commit.fileTypes,
        changeTypes: commit.changeTypes,
      }));

      console.log(`About to save ${commitRecords.length} commits to database for repository ${repositoryId}`);
      await storage.createCommits(commitRecords);
      console.log(`Successfully saved ${commitRecords.length} commits to database`);
      
      return commits;
    } catch (error) {
      throw new Error(`Failed to analyze commits: ${error.message}`);
    }
  }

  async getCommitDiff(commitSha: string): Promise<string> {
    if (!this.git) {
      throw new Error('Repository not cloned');
    }

    try {
      const diff = await this.git.show([commitSha, '--format=fuller']);
      return diff;
    } catch (error) {
      throw new Error(`Failed to get commit diff: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.repoPath) {
      try {
        await fs.rm(this.repoPath, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup repository: ${error.message}`);
      }
    }
  }

  async getRepositoryStats(): Promise<{
    totalCommits: number;
    totalFiles: number;
    contributors: Set<string>;
  }> {
    if (!this.git) {
      throw new Error('Repository not cloned');
    }

    try {
      const log = await this.git.log(['--all']);
      const contributors = new Set<string>();
      
      log.all.forEach(commit => {
        contributors.add(commit.author_email);
      });

      // Count files in repository
      const files = await this.git.raw(['ls-tree', '-r', '--name-only', 'HEAD']);
      const fileCount = files.split('\n').filter(f => f.trim()).length;

      return {
        totalCommits: log.total,
        totalFiles: fileCount,
        contributors,
      };
    } catch (error) {
      throw new Error(`Failed to get repository stats: ${error.message}`);
    }
  }

  private categorizeChanges(filePaths: string[], commitMessage: string): string[] {
    const changeTypes: string[] = [];
    const message = commitMessage.toLowerCase();
    
    // Check for new pages/routes
    const hasNewPages = filePaths.some(path => 
      path.includes('/pages/') || 
      path.includes('/page/') || 
      path.includes('/routes/') || 
      path.includes('/views/') ||
      path.includes('.page.') ||
      path.match(/\/(index|home|dashboard|profile|settings|login|signup)\.(js|ts|jsx|tsx|vue|html)$/)
    );
    
    if (hasNewPages) {
      changeTypes.push('new_page');
    }
    
    // Check for new components
    const hasNewComponents = filePaths.some(path => 
      path.includes('/components/') || 
      path.includes('/component/') ||
      path.match(/[A-Z][a-zA-Z]*\.(js|ts|jsx|tsx|vue)$/) ||
      message.includes('component')
    );
    
    if (hasNewComponents) {
      changeTypes.push('new_component');
    }
    
    // Check for API changes
    const hasApiChanges = filePaths.some(path => 
      path.includes('/api/') || 
      path.includes('/routes/') || 
      path.includes('/controllers/') ||
      path.includes('/endpoints/') ||
      message.includes('api') || 
      message.includes('endpoint')
    );
    
    if (hasApiChanges) {
      changeTypes.push('api_change');
    }
    
    // Check for database/schema changes
    const hasDbChanges = filePaths.some(path => 
      path.includes('schema') || 
      path.includes('migration') || 
      path.includes('model') ||
      path.includes('.sql') ||
      message.includes('database') || 
      message.includes('schema')
    );
    
    if (hasDbChanges) {
      changeTypes.push('database_change');
    }
    
    // Check for authentication changes
    const hasAuthChanges = filePaths.some(path => 
      path.includes('auth') || 
      path.includes('login') || 
      path.includes('signup') ||
      path.includes('password') || 
      path.includes('session')
    ) || message.includes('auth') || message.includes('login');
    
    if (hasAuthChanges) {
      changeTypes.push('authentication');
    }
    
    // Check for testing changes
    const hasTestChanges = filePaths.some(path => 
      path.includes('test') || 
      path.includes('spec') || 
      path.includes('.test.') || 
      path.includes('.spec.')
    );
    
    if (hasTestChanges) {
      changeTypes.push('testing');
    }
    
    // Check for configuration changes
    const hasConfigChanges = filePaths.some(path => 
      path.includes('config') || 
      path.includes('.env') || 
      path.includes('package.json') ||
      path.includes('dockerfile') || 
      path.includes('docker-compose')
    );
    
    if (hasConfigChanges) {
      changeTypes.push('configuration');
    }
    
    return changeTypes.length > 0 ? changeTypes : ['general'];
  }
}
