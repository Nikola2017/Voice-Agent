#!/bin/bash
# VelaMind - Setup Script
# Run this after downloading to create .env.local

echo "Creating .env.local file..."

cat > .env.local << 'EOF'
# ============================================
# VelaMind - Your API Keys
# ============================================

# OpenAI API Key (Required for AI features)
# Get your key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-PASTE-YOUR-KEY-HERE

# Model selection (cheapest option)
OPENAI_MODEL=gpt-4o-mini

# ============================================
# Optional APIs (add later if needed)
# ============================================
# ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE
# ELEVENLABS_API_KEY=YOUR-KEY-HERE
EOF

echo ""
echo "✅ .env.local created!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your OpenAI API key"
echo "2. Run: npm install"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000"
