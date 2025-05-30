# 🎬 RecapGPT - Video Analysis with AI Chat

A comprehensive video analysis system that processes YouTube/TikTok videos, generates transcripts with timestamps, detects recipes automatically, and provides an intelligent chat interface.

## 🌟 Features

### 📹 **Video Processing**

- **Multi-platform support**: YouTube, TikTok, and more
- **Automatic transcription** with precise timestamps
- **AI-powered summarization** in 3 key points
- **Recipe detection** with ingredient extraction

### 🤖 **Intelligent Chat**

- **Timestamp-aware responses**: "At 2:35, the speaker mentions..."
- **Recipe-specific assistant** with cooking advice
- **Automatic portion adaptation**: "I want this for 4 people"
- **Multi-language support**: Responds in the content's language

### 🍳 **Recipe Features**

- **Automatic ingredient extraction** with emojis (🥔 2 potatoes)
- **Smart portion scaling** with AI calculations
- **Cooking tips and timing** references from video
- **Temperature and technique** guidance

### 📱 **Mobile App**

- **Beautiful React Native interface**
- **Real-time processing** with animated loading
- **Recipe-specific UI** with cooking animations
- **Seamless chat experience** with timestamps

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Node.js API   │    │   AI Services   │
│      App        │◄──►│     Server      │◄──►│  OpenAI/DeepSeek│
│                 │    │                 │    │                 │
│ • Video Input   │    │ • yt-dlp        │    │ • Whisper       │
│ • Chat UI       │    │ • Transcription │    │ • GPT-4         │
│ • Recipe View   │    │ • AI Chat       │    │ • DeepSeek      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. **Server Setup**

```bash
cd Server
npm install
```

Create `.env` file:

```env
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
```

Install yt-dlp:

```bash
# macOS
brew install yt-dlp

# Ubuntu/Debian
sudo apt install yt-dlp

# Windows
pip install yt-dlp
```

Start server:

```bash
node index.js
```

### 2. **Mobile App Setup**

```bash
cd RecapGPT
npm install
npx expo start
```

## 📡 API Endpoints

### **POST** `/recap`

Process a video and generate comprehensive analysis.

**Request:**

```json
{
  "url": "https://youtube.com/watch?v=example"
}
```

**Response:**

```json
{
  "transcript": "Full transcript text...",
  "timestampedTranscript": "[0:00-0:05] First segment...\n[0:05-0:10] Second segment...",
  "summary": "Three-line summary of the video content",
  "isRecipe": true,
  "recipeData": "🥔 2 potatoes\n🧄 3 cloves garlic\n🧂 1 tsp salt"
}
```

### **POST** `/chat`

Chat about video content with AI assistant.

**Request:**

```json
{
  "message": "Where did you hear about salt?",
  "context": {
    "transcript": "...",
    "timestampedTranscript": "...",
    "summary": "...",
    "isRecipe": true,
    "recipeData": "..."
  }
}
```

**Response:**

```json
{
  "response": "At 0:15-0:25, the chef mentions adding a pinch of salt to enhance the flavor."
}
```

### **POST** `/adapt-recipe`

Scale recipe ingredients for different serving sizes.

**Request:**

```json
{
  "originalRecipe": "🥔 2 potatoes\n🧄 3 cloves garlic",
  "targetServings": 6,
  "originalServings": 3
}
```

**Response:**

```json
{
  "adaptedRecipe": "🥔 4 potatoes\n🧄 6 cloves garlic"
}
```

## 🎯 Usage Examples

### **Standard Video Analysis**

1. Paste YouTube/TikTok URL
2. Get 3-line summary + timestamps
3. Ask questions: "What happens at 2:30?"
4. Get precise answers: "At 2:35, the speaker explains..."

### **Recipe Processing**

1. Paste cooking video URL
2. AI detects recipe automatically
3. Get ingredients with emojis: 🥔 🧄 🧂
4. Ask: "I want this for 4 people"
5. Get scaled recipe instantly

### **Intelligent Chat**

```
User: "Where did you mention the cooking time?"
AI: "At 1:20-1:25, the chef says to cook for 15 minutes until golden brown."

User: "I want this for 6 people"
AI: "Recipe adapted for 6 people:
     🥔 6 potatoes (scaled from 2)
     🧄 9 cloves garlic (scaled from 3)"
```

## 🛠️ Technical Stack

### **Backend**

- **Node.js + Express**: REST API server
- **yt-dlp**: Video/audio downloading
- **OpenAI Whisper**: Audio transcription with timestamps
- **DeepSeek AI**: Intelligent chat and analysis
- **GPT-4**: Advanced content understanding

### **Frontend**

- **React Native + Expo**: Cross-platform mobile app
- **TypeScript**: Type-safe development
- **Reanimated**: Smooth animations
- **AsyncStorage**: Local data persistence

### **AI Services**

- **OpenAI Whisper**: Precise transcription with `timestamp_granularities`
- **DeepSeek Chat**: Cost-effective AI responses
- **Custom prompts**: Recipe detection and ingredient extraction

## 🎨 Key Features Showcase

### **🍳 Recipe Detection**

- Automatically detects cooking content
- Extracts ingredients with perfect emojis
- Shows cooking-themed loading animation
- Provides culinary-specific assistance

### **⏱️ Timestamp Precision**

- Every response includes exact timing
- Jump to specific moments in video
- Time-aware question answering
- Segment-based content analysis

### **🎯 Smart Adaptation**

- Natural language portion requests
- Intelligent quantity scaling
- Practical measurement rounding
- Maintains emoji formatting

### **📱 Beautiful Mobile UI**

- Recipe-specific orange theme
- Cooking emoji animations
- Seamless chat experience
- Real-time processing feedback

## 🔧 Configuration

### **Environment Variables**

```env
# Required
OPENAI_API_KEY=sk-...          # OpenAI API key
DEEPSEEK_API_KEY=sk-...        # DeepSeek API key

# Optional
PORT=3000                      # Server port (default: 3000)
```

### **Mobile App Config**

Update `RecapGPT/app.json` for app metadata and `RecapGPT/expo-env.d.ts` for environment types.

## 🚦 Development

### **Server Development**

```bash
cd Server
node index.js                 # Start server
# OR
npm run dev                    # With nodemon (if configured)
```

### **Mobile Development**

```bash
cd RecapGPT
npx expo start                 # Start Expo development server
npx expo start --ios          # iOS simulator
npx expo start --android      # Android emulator
```

## 📊 Performance

- **Transcription**: ~30 seconds for 5-minute video
- **AI Analysis**: ~3-5 seconds per response
- **Recipe Detection**: ~2 seconds additional processing
- **Mobile Rendering**: 60fps smooth animations

## 🔐 Security

- API keys stored in environment variables
- No video data stored permanently
- Temporary audio files auto-deleted
- Client-side input validation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for Whisper transcription technology
- **DeepSeek** for cost-effective AI chat capabilities
- **yt-dlp** for robust video downloading
- **Expo** for React Native development platform

---

**Built with ❤️ by Jeremy Garcini**

_Transform any video into an intelligent conversation_ 🎬✨
