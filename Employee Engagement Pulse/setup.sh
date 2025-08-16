#!/bin/bash

echo "🚀 Employee Engagement Pulse - Setup Script"
echo "==========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB doesn't appear to be running."
    echo "Please start MongoDB before continuing."
    echo "You can start it with: sudo systemctl start mongod"
    echo "Or using Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
fi

echo "📦 Installing server dependencies..."
cd server
npm install

echo "📦 Installing client dependencies..."
cd ../client
npm install

echo "⚙️  Setting up environment..."
cd ../server

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/employee-engagement-pulse

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)

# Server Configuration
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Slack App Configuration
# Get these from your Slack app settings at https://api.slack.com/apps
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_STATE_SECRET=$(openssl rand -base64 32)
SLACK_REDIRECT_URI=http://localhost:5001/api/slack/oauth/callback
EOF
    echo "✅ Created .env file with random secrets"
    echo "⚠️  Please update the Slack credentials in server/.env"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a Slack app at https://api.slack.com/apps"
echo "2. Update SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in server/.env"
echo "3. Start the application:"
echo ""
echo "   Terminal 1 (Server):"
echo "   cd server && npm run dev"
echo ""
echo "   Terminal 2 (Client):"
echo "   cd client && npm run dev"
echo ""
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "📖 For detailed setup instructions, see README.md"

