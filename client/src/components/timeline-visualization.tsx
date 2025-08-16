import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { ChangeEvent } from "@shared/schema";

interface TimelineVisualizationProps {
  events: ChangeEvent[];
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "new_feature": return "bg-github-success";
    case "enhancement": return "bg-github-blue";
    case "bug_fix": return "bg-github-error";
    case "refactoring": return "bg-github-warning";
    case "optimization": return "bg-purple-500";
    default: return "bg-gray-500";
  }
};

const getCategoryBadgeVariant = (category: string) => {
  switch (category) {
    case "new_feature": return "default";
    case "enhancement": return "secondary";
    case "bug_fix": return "destructive";
    case "refactoring": return "outline";
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
  // Sort events by timestamp (most recent first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10); // Show only recent 10 events

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
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Evolution Timeline</h3>
        
        <div className="relative">
          {/* Timeline axis */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
          
          <div className="space-y-6">
            {sortedEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start space-x-4" data-testid={`timeline-event-${index}`}>
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 ${getCategoryColor(event.category)} rounded-full border-2 border-white shadow`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium" data-testid={`event-title-${index}`}>
                      {event.title}
                    </span>
                    <Badge variant={getCategoryBadgeVariant(event.category) as any} size="sm">
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
            <Button variant="outline" size="sm" data-testid="button-view-complete-timeline">
              View Complete Timeline 
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
