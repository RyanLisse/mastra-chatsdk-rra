import { generateUUID } from '@/lib/utils';

export const TEST_PROMPTS = {
  SKY: {
    MESSAGE: {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      role: 'user',
      content: 'How do I calibrate the RoboRail measurement system?',
      parts: [
        {
          type: 'text',
          text: 'How do I calibrate the RoboRail measurement system?',
        },
      ],
    },
    OUTPUT_STREAM: [
      '0:"First, "',
      '0:"ensure "',
      '0:"the "',
      '0:"RoboRail "',
      '0:"is "',
      '0:"properly "',
      '0:"positioned "',
      '0:"and "',
      '0:"all "',
      '0:"measurement "',
      '0:"components "',
      '0:"are "',
      '0:"clean. "',
      'e:{"finishReason":"stop","usage":{"promptTokens":3,"completionTokens":10},"isContinued":false}',
      'd:{"finishReason":"stop","usage":{"promptTokens":3,"completionTokens":10}}',
    ],
  },
  GRASS: {
    MESSAGE: {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      role: 'user',
      content: 'What are the safety procedures for RoboRail maintenance?',
      parts: [
        {
          type: 'text',
          text: 'What are the safety procedures for RoboRail maintenance?',
        },
      ],
    },

    OUTPUT_STREAM: [
      '0:"Always "',
      '0:"wear "',
      '0:"proper "',
      '0:"PPE "',
      '0:"and "',
      '0:"ensure "',
      '0:"emergency "',
      '0:"stop "',
      '0:"procedures "',
      '0:"are "',
      '0:"understood. "',
      'e:{"finishReason":"stop","usage":{"promptTokens":3,"completionTokens":10},"isContinued":false}',
      'd:{"finishReason":"stop","usage":{"promptTokens":3,"completionTokens":10}}',
    ],
  },
};
