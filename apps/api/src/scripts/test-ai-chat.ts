import { aiService } from '../services/ai.service';
import { logger } from '../config/logger';

async function testAIChat() {
  logger.info({ event: 'test_ai_chat_started' });

  try {
    const messages = [
      { role: 'user' as const, content: 'Hello, can you help me test the AI chat?' },
    ];

    logger.info({ event: 'sending_request', messages });
    
    const response = await aiService.chat(messages);
    
    logger.info({ 
      event: 'test_ai_chat_success', 
      response: response.substring(0, 200) 
    });
    
    console.log('\n✅ AI Chat Test Successful!\n');
    console.log('Response:', response);
    
    process.exit(0);
  } catch (err) {
    const error = err as Error;
    logger.error({ 
      event: 'test_ai_chat_failed', 
      error: error.message,
      stack: error.stack,
    });
    
    console.error('\n❌ AI Chat Test Failed!\n');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    
    process.exit(1);
  }
}

testAIChat();
