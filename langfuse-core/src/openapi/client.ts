/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/api/public/scores": {
    /** @description Add a score to the database */
    post: operations["score_create"];
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    /** CreateScoreRequest */
    CreateScoreRequest: {
      id?: string;
      traceId: string;
      traceIdType?: components["schemas"]["TraceIdType"];
      name: string;
      /** Format: double */
      value: number;
      observationId?: string;
      comment?: string;
    };
    /** Score */
    Score: {
      id: string;
      traceId: string;
      name: string;
      /** Format: double */
      value: number;
      observationId?: string;
      /** Format: date-time */
      timestamp: string;
      comment?: string;
    };
    /**
     * TraceIdType
     * @enum {string}
     */
    TraceIdType: "LANGFUSE" | "EXTERNAL";
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export interface operations {
  /** @description Add a score to the database */
  score_create: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateScoreRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["Score"];
        };
      };
      400: {
        content: {
          "application/json": string;
        };
      };
      401: {
        content: {
          "application/json": string;
        };
      };
      403: {
        content: {
          "application/json": string;
        };
      };
      405: {
        content: {
          "application/json": string;
        };
      };
    };
  };
}
