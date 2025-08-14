import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/mongodb-schema";

interface ShareDialogProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareDialog({ document, isOpen, onClose }: ShareDialogProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [emailToShare, setEmailToShare] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [emailShareSuccess, setEmailShareSuccess] = useState(false);
  const [isPublic, setIsPublic] = useState(document.isPublic);
  
  const { user } = useAuth();
  const { toast } = useToast();

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/editor/${document.id}`;

  const copyToClipboard = async () => {
    try {
      // If document is private, warn user or auto-make it public
      if (!isPublic && user && document.ownerId === user.id) {
        const shouldMakePublic = confirm(
          "This document is currently private. Would you like to make it public so the link works for everyone?"
        );
        
        if (shouldMakePublic) {
          await togglePublicSharing();
        } else {
          toast({
            title: "Link copied (Private Document)",
            description: "Note: Only collaborators can access this private document link.",
            variant: "destructive",
          });
        }
      }
      
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const generateQRCode = () => {
    // Simple QR code generation using qr-server.com
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  };

  const togglePublicSharing = async () => {
    if (!user || document.ownerId !== user.id) {
      toast({
        title: "Permission denied",
        description: "Only the document owner can change sharing settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      if (!response.ok) {
        throw new Error("Failed to update sharing settings");
      }

      setIsPublic(!isPublic);
      toast({
        title: isPublic ? "Document made private" : "Document made public",
        description: isPublic 
          ? "Document is now private and requires authentication to access." 
          : "Document is now public and can be accessed via shared links.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sharing settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareViaEmail = async () => {
    if (!emailToShare.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to share with.",
        variant: "destructive",
      });
      return;
    }

    if (!user || document.ownerId !== user.id) {
      toast({
        title: "Permission denied",
        description: "Only the document owner can share documents.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      // First, find the user by email
      const searchResponse = await fetch(`/api/auth/users/search?email=${encodeURIComponent(emailToShare)}`);
      
      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          toast({
            title: "User not found",
            description: "No user found with that email address. They need to create an account first.",
            variant: "destructive",
          });
        } else {
          throw new Error("Failed to find user");
        }
        return;
      }

      const { user: targetUser } = await searchResponse.json();

      // Add user to collaborators
      const currentCollaborators = document.collaborators || [];
      if (!currentCollaborators.includes(targetUser.id)) {
        const updateResponse = await fetch(`/api/documents/${document.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            collaborators: [...currentCollaborators, targetUser.id] 
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to add collaborator");
        }

        setEmailShareSuccess(true);
        setEmailToShare("");
        toast({
          title: "Document shared!",
          description: `Document shared with ${targetUser.username} (${targetUser.email})`,
        });

        setTimeout(() => setEmailShareSuccess(false), 3000);
      } else {
        toast({
          title: "Already shared",
          description: "This document is already shared with that user.",
        });
      }
    } catch (error) {
      toast({
        title: "Error sharing document",
        description: "Failed to share document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Share Document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-300 mb-2">Document: <span className="font-medium">{document.title}</span></p>
          <p className="text-gray-400 text-sm">Share this link to collaborate in real-time</p>
        </div>

        {/* Public Sharing Toggle */}
        {user && document.ownerId === user.id && (
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 font-medium">Public Access</p>
                <p className="text-gray-400 text-sm">
                  {isPublic ? "Anyone with the link can view" : "Only collaborators can view"}
                </p>
              </div>
              <button
                onClick={togglePublicSharing}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Email Sharing */}
        {user && document.ownerId === user.id && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">Share with Email</label>
            <div className="flex">
              <input
                type="email"
                value={emailToShare}
                onChange={(e) => setEmailToShare(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-l-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={shareViaEmail}
                disabled={isSharing}
                className={`px-4 py-2 rounded-r-lg transition-colors ${
                  emailShareSuccess 
                    ? 'bg-green-600 text-white' 
                    : isSharing 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSharing ? '...' : emailShareSuccess ? '✓' : 'Share'}
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">User must have an account to be added as collaborator</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-300">Share URL</label>
          <div className="flex">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-gray-700 border border-gray-600 rounded-l-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-r-lg transition-colors ${
                copySuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copySuccess ? '✓' : 'Copy'}
            </button>
          </div>
          {!isPublic && (
            <p className="text-orange-400 text-xs mt-1">
              ⚠️ This link only works for collaborators since the document is private.
            </p>
          )}
        </div>

        {isPublic && (
          <div className="mb-6 text-center">
            <p className="text-gray-400 text-sm mb-2">Or scan QR code</p>
            <div className="inline-block p-2 bg-white rounded-lg">
              <img
                src={generateQRCode()}
                alt="QR Code for sharing"
                className="w-32 h-32"
              />
            </div>
          </div>
        )}

        {!isPublic && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-sm">
              <strong>Note:</strong> This document is private. Enable public access above to share via link or QR code.
            </p>
          </div>
        )}

        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Active users: {document.activeUsers?.length || 0}</span>
            <span>Language: {document.language}</span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}