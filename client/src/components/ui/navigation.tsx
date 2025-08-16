import { Link, useLocation } from "wouter";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="bg-white border-b border-github-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-github-blue hover:text-blue-700">
              <Clock className="w-6 h-6" />
              <h1 className="text-xl font-semibold text-gray-900">Codebase Time Machine</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button size="sm" className="bg-github-blue hover:bg-blue-700" data-testid="button-new-analysis">
                <Plus className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
