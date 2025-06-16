import type { CoreMessage } from 'ai';

export const TEST_PROMPTS: Record<string, CoreMessage> = {
  USER_CALIBRATION: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'How do I calibrate the RoboRail measurement system?',
      },
    ],
  },
  USER_SAFETY: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'What are the safety procedures for RoboRail maintenance?',
      },
    ],
  },
  USER_THANKS: {
    role: 'user',
    content: [{ type: 'text', text: 'Thanks!' }],
  },
  USER_PMAC_ISSUE: {
    role: 'user',
    content: [
      { type: 'text', text: 'What should I do if the PMAC is not responding?' },
    ],
  },
  USER_IMAGE_ATTACHMENT: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'What component is shown in this image?',
      },
      {
        type: 'image',
        image: '...',
      },
    ],
  },
  USER_TEXT_ARTIFACT: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Help me create a maintenance checklist for RoboRail',
      },
    ],
  },
  CREATE_DOCUMENT_TEXT_CALL: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'RoboRail Maintenance Checklist',
      },
    ],
  },
  CREATE_DOCUMENT_TEXT_RESULT: {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'call_123',
        toolName: 'createDocument',
        result: {
          id: '3ca386a4-40c6-4630-8ed1-84cbd46cc7eb',
          title: 'RoboRail Maintenance Checklist',
          kind: 'text',
          content: 'A document was created and is now visible to the user.',
        },
      },
    ],
  },
  GET_TROUBLESHOOTING_CALL: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'What are the troubleshooting steps for communication errors?',
      },
    ],
  },
  GET_WEATHER_RESULT: {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'call_456',
        toolName: 'getWeather',
        result: {
          latitude: 37.763283,
          longitude: -122.41286,
          generationtime_ms: 0.06449222564697266,
          utc_offset_seconds: -25200,
          timezone: 'America/Los_Angeles',
          timezone_abbreviation: 'GMT-7',
          elevation: 18,
          current_units: {
            time: 'iso8601',
            interval: 'seconds',
            temperature_2m: '°C',
          },
          current: {
            time: '2025-03-10T14:00',
            interval: 900,
            temperature_2m: 17,
          },
          daily_units: {
            time: 'iso8601',
            sunrise: 'iso8601',
            sunset: 'iso8601',
          },
          daily: {
            time: [
              '2025-03-10',
              '2025-03-11',
              '2025-03-12',
              '2025-03-13',
              '2025-03-14',
              '2025-03-15',
              '2025-03-16',
            ],
            sunrise: [
              '2025-03-10T07:27',
              '2025-03-11T07:25',
              '2025-03-12T07:24',
              '2025-03-13T07:22',
              '2025-03-14T07:21',
              '2025-03-15T07:19',
              '2025-03-16T07:18',
            ],
            sunset: [
              '2025-03-10T19:12',
              '2025-03-11T19:13',
              '2025-03-12T19:14',
              '2025-03-13T19:15',
              '2025-03-14T19:16',
              '2025-03-15T19:17',
              '2025-03-16T19:17',
            ],
          },
        },
      },
    ],
  },
};
