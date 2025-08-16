import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUp } from "lucide-react";
import type { ChangeEvent } from "@shared/schema";

interface TimelineVisualizationProps {
  events: ChangeEvent[];
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "new_feature": return "bg-green-500";
    case "enhancement": return "bg-blue-500"; 
    case "bug_fix": return "bg-red-500";
    case "refactoring": return "bg-orange-500";
    case "optimization": return "bg-purple-500";
    default: return "bg-gray-500";
  }
};

const getCategoryBadgeVariant = (category: string) => {
  switch (category) {
    case "new_feature": return "default"; // green
    case "enhancement": return "secondary"; // blue 
    case "bug_fix": return "destructive"; // red
    case "refactoring": return "outline"; // neutral
    case "optimization": return "secondary";
    default: return "outline";
  }
};

const formatCategory = (category: string) => {
  return category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export default function TimelineVisualization({ events }: TimelineVisualizationProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Sort events by timestamp (most recent first)
  const allSortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Show only recent 10 events unless user wants to see all
  const sortedEvents = showAll ? allSortedEvents : allSortedEvents.slice(0, 10);

  if (sortedEvents.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Evolution Timeline</h3>
          <p className="text-github-gray text-center py-8">
            No change events have been identified yet. Analysis may still be in progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-xl">
      <CardContent className="p-8">
        <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
          <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-3"></div>
          Evolution Timeline
        </h3>
        
        <div className="relative">
          {/* Enhanced Timeline axis with gradient */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-purple-500 to-indigo-600 rounded-full opacity-60" />
          
          <div className="space-y-8">
            {sortedEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start space-x-6 group hover:bg-slate-50/50 rounded-lg p-4 -m-4 transition-all duration-200" data-testid={`timeline-event-${index}`}>
                <div className="flex-shrink-0 relative">
                  <div className={`w-4 h-4 ${getCategoryColor(event.category)} rounded-full border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-200`} />
                  <div className={`absolute inset-0 w-4 h-4 ${getCategoryColor(event.category)} rounded-full animate-ping opacity-20`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium" data-testid={`event-title-${index}`}>
                      {event.title}
                    </span>
                    <Badge variant={getCategoryBadgeVariant(event.category) as any}>
                      {formatCategory(event.category)}
                    </Badge>
                  </div>
                  <p className="text-sm text-github-gray mb-2" data-testid={`event-description-${index}`}>
                    {event.description}
                  </p>
                  <div className="text-xs text-github-gray">
                    <span data-testid={`event-timestamp-${index}`}>
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                    {event.commitShas.length > 0 && (
                      <>
                        <span className="mx-1">•</span>
                        <span data-testid={`event-commits-${index}`}>
                          {event.commitShas.length} commit{event.commitShas.length > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                    {event.filesAffected.length > 0 && (
                      <>
                        <span className="mx-1">•</span>
                        <span data-testid={`event-files-${index}`}>
                          {event.filesAffected.length} file{event.filesAffected.length > 1 ? 's' : ''} affected
                        </span>
                      </>
                    )}
                  </div>
                  {event.rationale && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-github-gray">
                      <strong>Rationale:</strong> {event.rationale}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {events.length > 10 && (
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              data-testid="button-view-complete-timeline"
            >
              {showAll ? (
                <>
                  Show Recent Only
                  <ArrowUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  View Complete Timeline ({events.length} total)
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
