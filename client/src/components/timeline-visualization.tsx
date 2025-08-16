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
    case "new_feature":
      return "bg-green-500";
    case "enhancement":
      return "bg-blue-500";
    case "bug_fix":
      return "bg-red-500";
    case "refactoring":
      return "bg-gray-500";
    case "optimization":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
};

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case "new_feature":
      return "bg-green-500 text-white border-green-600"; // green
    case "enhancement":
      return "bg-blue-500 text-white border-blue-600"; // blue 
    case "bug_fix":
      return "bg-red-500 text-white border-red-600"; // red
    case "refactoring":
      return "bg-gray-500 text-white border-gray-600"; // neutral
    case "optimization":
      return "bg-purple-500 text-white border-purple-600";
    default:
      return "bg-gray-500 text-white border-gray-600";
  }
};

const formatCategory = (category: string) => {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function TimelineVisualization({
  events,
}: TimelineVisualizationProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort events by timestamp (most recent first)
  const allSortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Show only recent 10 events unless user wants to see all
  const sortedEvents = showAll ? allSortedEvents : allSortedEvents.slice(0, 10);

  if (sortedEvents.length === 0) {
    return (
      <Card className="enhanced-card">
        <CardContent className="p-10">
          <h3 className="text-2xl font-bold gradient-text mb-8 flex items-center">
            <div className="w-3 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-4"></div>
            Evolution Timeline
          </h3>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⏳</span>
            </div>
            <p className="text-gray-600 text-lg font-medium">
              No change events have been identified yet. Analysis may still be
              in progress.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-10">
        <h3 className="text-2xl font-bold gradient-text mb-8 flex items-center">
          <div className="w-3 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-4"></div>
          Evolution Timeline
        </h3>

        <div className="relative">
          {/* Enhanced Timeline axis with gradient */}
          <div className="absolute left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-purple-500 to-indigo-600 rounded-full opacity-70 shadow-sm" />

          <div className="space-y-10">
            {sortedEvents.map((event, index) => (
              <div
                key={event.id}
                className="relative flex items-start space-x-8 group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 rounded-2xl p-6 -m-6 transition-all duration-300 hover:shadow-lg"
                data-testid={`timeline-event-${index}`}
              >
                <div className="flex-shrink-0 relative">
                  <div
                    className={`w-6 h-6 ${getCategoryColor(event.category)} rounded-full border-4 border-white shadow-xl group-hover:scale-125 transition-all duration-300`}
                  />
                  <div
                    className={`absolute inset-0 w-6 h-6 ${getCategoryColor(event.category)} rounded-full animate-ping opacity-30`}
                  ></div>
                  <div className="absolute inset-0 w-6 h-6 bg-white rounded-full blur-sm opacity-50"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-3">
                    <span
                      className="text-lg font-bold text-gray-900"
                      data-testid={`event-title-${index}`}
                    >
                      {event.title}
                    </span>
                    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getCategoryBadgeStyle(event.category)}`}>
                      {formatCategory(event.category)}
                    </div>
                  </div>
                  <p
                    className="text-gray-700 mb-4 leading-relaxed"
                    data-testid={`event-description-${index}`}
                  >
                    {event.description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span
                        className="font-medium"
                        data-testid={`event-timestamp-${index}`}
                      >
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {event.commitShas.length > 0 && (
                      <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span
                          className="font-medium"
                          data-testid={`event-commits-${index}`}
                        >
                          {event.commitShas.length} commit
                          {event.commitShas.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {event.filesAffected.length > 0 && (
                      <div className="flex items-center space-x-2 bg-purple-100 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        <span
                          className="font-medium"
                          data-testid={`event-files-${index}`}
                        >
                          {event.filesAffected.length} file
                          {event.filesAffected.length > 1 ? "s" : ""} affected
                        </span>
                      </div>
                    )}
                  </div>
                  {event.rationale && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                      <strong className="text-gray-800 font-semibold">
                        Rationale:
                      </strong>
                      <span className="text-gray-700 ml-2">
                        {event.rationale}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {events.length > 10 && (
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAll(!showAll)}
              className="bg-white/80 border-slate-300 hover:bg-white hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm px-8 py-3"
              data-testid="button-view-complete-timeline"
            >
              {showAll ? (
                <>
                  Show Recent Only
                  <ArrowUp className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  View Complete Timeline ({events.length} total)
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
