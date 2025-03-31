# 🌟 Ell-ena: AI Product Manager & Personal Assistant

"Your work, remembered. Your tasks, handled. Your thoughts, organized."

## 🔍 Overview

Ell-ena is a mobile-first, AI-powered Product Manager + Personal Assistant that helps users manage tasks, create tickets, transcribe meetings, and retain full contextual awareness — all through natural language.

## 💼 Use Cases

- **Students**: Manage academic tasks, assignment deadlines, exam prep, reminders
- **Freelancers**: Convert client discussions to actionable tickets, timelines, and track progress
- **Teams**: Auto-create tasks/tickets from meetings or brainstorming sessions
- **Product Managers**: Streamline backlog management, idea dumps, and stakeholder coordination
- **Solo Workers**: Offload mental clutter and manage life + work with an AI that remembers

## 🎯 Core Features

- 🧠 **Natural Language Understanding**: Parses user input to extract task details, types, deadlines, and relations
- 📋 **Task & Ticket Generator**: Generates structured to-do/ticket items from chat
- 💬 **Conversational Interface**: Users interact with Ell-ena via a chat UI
- 🕸️ **Graph-based Memory**: Remembers context (who, what, when, why) across sessions and topics
- 📅 **Calendar Integration**: Parses date/time and syncs tasks/events into user's calendar
- 🧾 **Meeting Transcription**: Accepts audio input and transcribes, then extracts actionable items
- 🔁 **Task History & Recall**: "What did I ask you to do last week?" → Ell-ena responds
- 📦 **Multi-Workspace Support**: Manage personal + work projects separately but intelligently
- 🔒 **Secure + Private**: Auth + encrypted task storage

## 🛠️ Tech Stack

- **Mobile UI**: React Native + Expo
- **Chat UI**: Gifted Chat / Paper UI
- **Backend**: Fastify with TypeScript
- **DB**: Supabase (PostgreSQL)
- **AI**: OpenAI / LangChain
- **Graph RAG**: Neo4j / Weaviate
- **Audio**: Whisper API
- **Deployment**: Render (MVP), Fly.io or Vercel edge functions (v1)

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ell-ena.git
cd ell-ena
```

2. Install dependencies:
```bash
# Install root dependencies
yarn install

# Install mobile app dependencies
cd mobile && yarn install

# Install backend dependencies
cd ../backend && yarn install
```

3. Set up environment variables:
```bash
# In the backend directory
cp .env.example .env
# Fill in your API keys and database credentials
```

4. Start the development servers:
```bash
# Start the backend server
cd backend && yarn dev

# Start the mobile app
cd ../mobile && yarn start
```

## Project Structure

```
ell-ena/
├── mobile/               # React Native mobile app
│   ├── app/              # App screens and navigation
│   ├── components/       # Reusable UI components
│   └── services/         # API clients and services
├── backend/              # Fastify backend server
│   ├── src/              # Source code
│   │   ├── api/          # API routes
│   │   ├── services/     # Business logic
│   │   └── db/           # Database models and queries
│   └── tests/            # Backend tests
├── docs/                 # Documentation
└── README.md             # Project README
```

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 