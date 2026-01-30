# 🎤 VoxAI - Voice-to-SQL Platform

VoxAI is a comprehensive AI-powered platform that converts voice commands into SQL queries, featuring a modern web interface, intelligent conversational AI, and multiple specialized microservices.

## 🌟 Features

- **🎙️ Voice-to-Text**: Convert spoken commands to text using OpenAI Whisper
- **🤖 Text-to-SQL**: Transform natural language into executable SQL queries
- **💬 Conversational AI**: Intelligent chat capabilities using local LLM models
- **📝 Text-to-Title**: Generate meaningful titles from text content
- **🔐 User Authentication**: Secure user management with Firebase
- **🗄️ Database Integration**: Support for multiple database connections
- **📱 Modern UI**: Responsive React/Next.js frontend with beautiful animations
- **🔄 Real-time Processing**: Live voice recording and instant query generation

## 🏗️ Architecture

VoxAI consists of 6 main services:

```
VoxAI Platform
├── 🖥️  Frontend (Next.js/React)
├── 🔧 Backend (Node.js/Express)
├── 🤖 Conversational AI (Python/Flask + Ollama)
├── 🔤 Text-to-SQL (Python/Flask + Transformers)
├── 📝 Text-to-Title (Python/Flask + Transformers)
└── 🎙️ Whisper API (Python/Flask + OpenAI Whisper)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ and pip
- **Git**
- **8GB+ RAM** (for AI models)
- **10GB+ free disk space**

### 1. Clone the Repository

```bash
git clone https://github.com/mortiestmorty1/FYP-VOXAi.git
cd FYP-VOXAi
```

### 2. Setup Environment Variables

Create `.env` files in the `backend/` directory:

```bash
# backend/.env
URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FIREBASE_PROJECT_ID=your_firebase_project_id
```

### 3. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install
cd ..

# Frontend dependencies
cd frontend
npm install
cd ..

# Python services dependencies
cd conversational-ai
pip install -r requirements.txt
cd ..

cd Text-to-Sql
pip install -r requirements.txt
cd ..

cd text-to-title
pip install -r requirements.txt
cd ..

cd whisper-api
pip install -r requirements.txt
cd ..
```

### 4. Setup AI Services

#### Install Ollama (for Conversational AI)
```bash
# macOS
brew install ollama
# or
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve &

# Install AI models
ollama pull llama3.2:1b
ollama pull phi3:mini
```

#### Download AI Models

The Text-to-SQL and Text-to-Title services require pre-trained models. These will be downloaded automatically on first run or you can download them manually.

### 5. Start All Services

Open 6 terminal windows and run:

```bash
# Terminal 1: Ollama (if not already running)
ollama serve

# Terminal 2: Backend API
cd backend
npm start

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: Conversational AI
cd conversational-ai
python app.py

# Terminal 5: Text-to-SQL Service
cd Text-to-Sql
python app.py

# Terminal 6: Whisper API
cd whisper-api
python app.py

# Terminal 7: Text-to-Title Service
cd text-to-title
python app.py
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Conversational AI**: http://localhost:5004
- **Text-to-SQL**: http://localhost:5000
- **Whisper API**: http://localhost:5001
- **Text-to-Title**: http://localhost:5002

## 📋 Service Details

### 🖥️ Frontend (Next.js/React)
- **Location**: `frontend/`
- **Port**: 3000
- **Features**: Modern UI, voice recording, real-time chat, database integration
- **Tech Stack**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion

### 🔧 Backend (Node.js/Express)
- **Location**: `backend/`
- **Port**: 3001
- **Features**: User authentication, chat management, database connections, file uploads
- **Tech Stack**: Express.js, MongoDB, Firebase Admin, JWT, Multer

### 🤖 Conversational AI
- **Location**: `conversational-ai/`
- **Port**: 5004
- **Features**: Natural language conversations, context awareness, multiple AI models
- **Tech Stack**: Flask, Ollama, Llama 3.2, Phi 3

### 🔤 Text-to-SQL
- **Location**: `Text-to-Sql/`
- **Port**: 5000
- **Features**: Natural language to SQL conversion, schema validation, query optimization
- **Tech Stack**: Flask, Transformers, PyTorch, SQLParse

### 📝 Text-to-Title
- **Location**: `text-to-title/`
- **Port**: 5002
- **Features**: Automatic title generation from text content
- **Tech Stack**: Flask, Transformers, RoBERTa

### 🎙️ Whisper API
- **Location**: `whisper-api/`
- **Port**: 5001
- **Features**: Voice-to-text transcription, audio file processing
- **Tech Stack**: Flask, OpenAI Whisper, FFmpeg

## 🛠️ Development Setup

### Setting up Development Environment

1. **Install development tools**:
   ```bash
   # Install nodemon for backend development
   cd backend
   npm install -g nodemon
   
   # Install development dependencies
   npm install --save-dev
   ```

2. **Run in development mode**:
   ```bash
   # Backend with hot reload
   cd backend
   npm run dev
   
   # Frontend with hot reload
   cd frontend
   npm run dev
   ```

### Database Setup

1. **MongoDB**: Set up MongoDB Atlas or local MongoDB instance
2. **Firebase**: Configure Firebase project for authentication
3. **SQL Databases**: Configure connections for SQL query testing

## 🔧 Configuration

### Backend Configuration
Edit `backend/.env`:
```env
URI=mongodb://localhost:27017/voxai
JWT_SECRET=your-super-secret-jwt-key
PORT=3001
FIREBASE_PROJECT_ID=your-firebase-project
```

### AI Services Configuration

#### Conversational AI
Edit `conversational-ai/app.py`:
```python
DEFAULT_MODEL = "llama3.2:1b"
FALLBACK_MODEL = "phi3:mini"
OLLAMA_BASE_URL = "http://localhost:11434"
```

#### Text-to-SQL
The service automatically handles schema validation and relationship detection.

#### Whisper API
Configure audio processing settings in `whisper-api/app.py`:
```python
model = whisper.load_model("medium")  # Options: tiny, base, small, medium, large
```

## 📊 System Requirements

### Minimum Requirements
- **RAM**: 8GB
- **Storage**: 10GB free space
- **CPU**: 4 cores
- **OS**: macOS 10.15+, Ubuntu 18.04+, Windows 10+

### Recommended Requirements
- **RAM**: 16GB+
- **Storage**: 20GB+ free space
- **CPU**: 8 cores
- **GPU**: Optional (for faster AI inference)
- **OS**: macOS 12+, Ubuntu 20.04+, Windows 11

## 🎯 API Documentation

### Backend API Endpoints

```http
# User Management
POST /user/register
POST /user/login
GET /user/profile

# Chat Management
POST /chat/save
GET /chat/history
DELETE /chat/:id

# Database Integration
POST /database/connect
GET /database/tables
POST /database/execute

# Voice Processing
POST /voice-to-text/transcribe

# Text to SQL
POST /text-to-sql/generate
```

### AI Service Endpoints

```http
# Conversational AI
POST /chat
GET /status
GET /models

# Text-to-SQL
POST /nl-to-sql

# Text-to-Title
POST /generate-title

# Whisper API
POST /transcribe
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Python services tests
cd conversational-ai
python -m pytest tests/

# Integration tests
python test_integration.py
```

### Test Coverage

- Unit tests for all API endpoints
- Integration tests for service communication
- End-to-end tests for user workflows
- Performance tests for AI model inference

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**:
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export FLASK_ENV=production
   ```

2. **Build Applications**:
   ```bash
   # Build frontend
   cd frontend
   npm run build
   
   # Start production services
   npm start
   ```

3. **Process Management**:
   ```bash
   # Using PM2 for Node.js services
   npm install -g pm2
   pm2 start ecosystem.config.js
   
   # Using supervisord for Python services
   sudo apt install supervisor
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔒 Security

- **Authentication**: JWT-based authentication with Firebase
- **Data Privacy**: All AI processing happens locally
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting implemented
- **CORS**: Properly configured CORS policies

## 🐛 Troubleshooting

### Common Issues

1. **Ollama not starting**:
   ```bash
   # Check if port is in use
   lsof -i :11434
   # Restart Ollama
   pkill ollama && ollama serve
   ```

2. **Python dependency issues**:
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Node.js module issues**:
   ```bash
   # Clear npm cache
   npm cache clean --force
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **AI model loading issues**:
   ```bash
   # Check available models
   ollama list
   # Re-download model
   ollama pull llama3.2:1b
   ```

### Performance Optimization

1. **For better AI performance**:
   - Use smaller models (phi3:mini) for faster responses
   - Increase system RAM
   - Use SSD storage
   - Close unnecessary applications

2. **For better web performance**:
   - Enable Next.js production mode
   - Use CDN for static assets
   - Implement caching strategies
   - Optimize database queries

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Code Style

- **JavaScript/TypeScript**: ESLint + Prettier
- **Python**: Black + flake8
- **Commit Messages**: Conventional Commits format

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🆘 Support

- **Documentation**: Check this README and service-specific docs
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

## 🎉 Acknowledgments

- **OpenAI Whisper** for speech recognition
- **Ollama** for local AI model serving
- **Hugging Face Transformers** for NLP models
- **Next.js** and **React** for the frontend framework
- **Firebase** for authentication services

## 📈 Roadmap

- [ ] Multi-language support
- [ ] Advanced SQL query optimization
- [ ] Custom AI model training
- [ ] Mobile app development
- [ ] Cloud deployment options
- [ ] Advanced analytics dashboard
- [ ] Plugin system for custom databases

---

**Made with ❤️ by the VoxAI Team**

For more information, visit our [documentation](docs/) or [contact us](mailto:support@voxai.com). 