export type ErrorType =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'offline'
  | 'internal_error'
  | 'too_many_sessions'
  | 'session_expired';

export type Surface =
  | 'chat'
  | 'auth'
  | 'api'
  | 'stream'
  | 'database'
  | 'history'
  | 'vote'
  | 'document'
  | 'suggestions'
  | 'voice'
  | 'voice_session'
  | 'voice_stream'
  | 'voice_action'
  | 'voice_disconnect'
  | 'text_required'
  | 'audio_required'
  | 'voice_session_required'
  | 'invalid_action'
  | 'internal_server_error'
  | 'save_message'
  | 'invalid_message_data'
  | 'incomplete_message'
  | 'memory_save_failed'
  | 'memory_read_failed'
  | 'memory_clear_failed'
  | 'session_id_required'
  | 'invalid_audio_data'
  | 'invalid_audio_format'
  | 'audio_processing_failed';

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = 'response' | 'log' | 'none';

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: 'log',
  chat: 'response',
  auth: 'response',
  stream: 'response',
  api: 'response',
  history: 'response',
  vote: 'response',
  document: 'response',
  suggestions: 'response',
  voice: 'response',
  voice_session: 'response',
  voice_stream: 'response',
  voice_action: 'response',
  voice_disconnect: 'response',
  text_required: 'response',
  audio_required: 'response',
  voice_session_required: 'response',
  invalid_action: 'response',
  internal_server_error: 'log',
  save_message: 'response',
  invalid_message_data: 'response',
  incomplete_message: 'response',
  memory_save_failed: 'log',
  memory_read_failed: 'log',
  memory_clear_failed: 'log',
  session_id_required: 'response',
  invalid_audio_data: 'response',
  invalid_audio_format: 'response',
  audio_processing_failed: 'response',
};

export class ChatSDKError extends Error {
  public type: ErrorType;
  public surface: Surface;
  public statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(':');

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  public toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === 'log') {
      console.error({
        code,
        message,
        cause,
      });

      return Response.json(
        { code: '', message: 'Something went wrong. Please try again later.' },
        { status: statusCode },
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes('database')) {
    return 'An error occurred while executing a database query.';
  }

  switch (errorCode) {
    case 'bad_request:api':
      return "The request couldn't be processed. Please check your input and try again.";

    case 'unauthorized:auth':
      return 'You need to sign in before continuing.';
    case 'forbidden:auth':
      return 'Your account does not have access to this feature.';

    case 'rate_limit:chat':
      return 'You have exceeded your maximum number of messages for the day. Please try again later.';
    case 'not_found:chat':
      return 'The requested chat was not found. Please check the chat ID and try again.';
    case 'forbidden:chat':
      return 'This chat belongs to another user. Please check the chat ID and try again.';
    case 'unauthorized:chat':
      return 'You need to sign in to view this chat. Please sign in and try again.';
    case 'offline:chat':
      return "We're having trouble sending your message. Please check your internet connection and try again.";

    case 'not_found:document':
      return 'The requested document was not found. Please check the document ID and try again.';
    case 'forbidden:document':
      return 'This document belongs to another user. Please check the document ID and try again.';
    case 'unauthorized:document':
      return 'You need to sign in to view this document. Please sign in and try again.';
    case 'bad_request:document':
      return 'The request to create or update the document was invalid. Please check your input and try again.';

    // Voice-related error messages
    case 'unauthorized:voice':
      return 'You need to sign in to use voice features. Please sign in and try again.';
    case 'rate_limit:voice':
      return 'You have exceeded your maximum number of voice messages for the day. Please try again later.';
    case 'not_found:voice_session':
      return 'The voice session was not found. Please initialize a new voice session.';
    case 'bad_request:voice_session_required':
      return 'A voice session ID is required for this operation.';
    case 'bad_request:text_required':
      return 'Text content is required for this voice operation.';
    case 'bad_request:audio_required':
      return 'Audio data is required for this voice operation.';
    case 'bad_request:invalid_action':
      return 'The requested voice action is invalid. Please check the action parameter.';
    case 'too_many_sessions:voice':
      return 'You have reached the maximum number of active voice sessions. Please disconnect an existing session and try again.';
    case 'session_expired:voice':
      return 'This voice session has expired. Please create a new session to continue.';
    case 'bad_request:invalid_audio_data':
      return 'The audio data provided is invalid or empty. Please check your audio input.';
    case 'bad_request:invalid_audio_format':
      return 'The audio format is invalid. Audio data must be properly formatted for processing.';
    case 'bad_request:audio_processing_failed':
      return 'Failed to process the audio data. Please try again with valid audio input.';

    // Save-message API error messages
    case 'unauthorized:save_message':
      return 'You need to sign in to save messages. Please sign in and try again.';
    case 'bad_request:invalid_message_data':
      return 'The message data provided is invalid. Please check the format and try again.';
    case 'bad_request:incomplete_message':
      return 'The message is missing required fields (id, role, or content).';
    case 'bad_request:session_id_required':
      return 'A session ID is required for this operation.';

    default:
      return 'Something went wrong. Please try again later.';
  }
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case 'bad_request':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'rate_limit':
      return 429;
    case 'too_many_sessions':
      return 429;
    case 'session_expired':
      return 410;
    case 'offline':
      return 503;
    case 'internal_error':
      return 500;
    default:
      return 500;
  }
}
