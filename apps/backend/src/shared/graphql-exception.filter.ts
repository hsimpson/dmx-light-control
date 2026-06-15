// graphql-exception.filter.ts
import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { BaseDomainError } from './exceptions';

interface NestHttpExceptionResponse {
  message: string | string[];
  error: string;
  statusCode: number;
}

// Define the exact shape NestJS uses for its HttpExceptions
interface NestHttpExceptionShape {
  getResponse: () => unknown;
  getStatus: () => number;
}

@Catch()
export class GlobalGqlExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GlobalGqlExceptionFilter.name);

  public catch(exception: unknown, _host: ArgumentsHost): GraphQLError {
    if (exception instanceof BaseDomainError) {
      return new GraphQLError(exception.message, {
        extensions: {
          code: exception.code,
          http: { status: exception.statusCode },
        },
      });
    }

    if (this.isNestHttpException(exception)) {
      // Because of the type guard, 'exception' is safely typed as NestHttpExceptionShape here
      const response = exception.getResponse() as NestHttpExceptionResponse;
      const status = exception.getStatus();

      if (status === 400) {
        return new GraphQLError('Bad Request', {
          extensions: {
            code: 'BAD_USER_INPUT',
            errors: response.message,
            http: { status: 400 },
          },
        });
      }
    }

    if (exception instanceof Error) {
      // Pass the stack trace separately so Nest can format it in red text below the message
      this.logger.error(`Unhandled System Error: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Catastrophic Unknown Error thrown:', exception);
    }

    return new GraphQLError('Internal server error', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        http: { status: 500 },
      },
    });
  }

  /**
   * Fully ESLint-safe Type Guard
   */
  private isNestHttpException(exception: unknown): exception is NestHttpExceptionShape {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }

    // Explicitly cast to Record<string, unknown> instead of any to look for keys safely
    const obj = exception as Record<string, unknown>;

    return (
      'getResponse' in obj &&
      'getStatus' in obj &&
      typeof obj.getResponse === 'function' &&
      typeof obj.getStatus === 'function'
    );
  }
}
