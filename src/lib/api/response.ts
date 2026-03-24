// API response utilities

import { NextResponse } from "next/server"

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
  }
}

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function errorResponse(
  message: string,
  code: string = ErrorCodes.INTERNAL_ERROR,
  status: number = 500,
  details?: any
): NextResponse {
  const response: ErrorResponse = {
    error: { code, message, details },
  }
  return NextResponse.json(response, { status })
}

export function notFoundResponse(message: string = "Resource not found"): NextResponse {
  return errorResponse(message, ErrorCodes.NOT_FOUND, 404)
}

export function unauthorizedResponse(message: string = "Unauthorized"): NextResponse {
  return errorResponse(message, ErrorCodes.UNAUTHORIZED, 401)
}

export function forbiddenResponse(message: string = "Forbidden"): NextResponse {
  return errorResponse(message, ErrorCodes.FORBIDDEN, 403)
}

export function validationErrorResponse(errors: any[]): NextResponse {
  return errorResponse("Validation failed", ErrorCodes.VALIDATION_ERROR, 400, errors)
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number
): NextResponse {
  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
      totalItems,
    },
  }
  return NextResponse.json(response)
}

export function getPaginationParams(request: Request): { page: number; pageSize: number } {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get("page") || "1", 10)
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20", 10), 100)
  return { page: Math.max(1, page), pageSize: Math.max(1, pageSize) }
}

export function getFilterParams(request: Request, allowedFilters: string[]): Record<string, string> {
  const url = new URL(request.url)
  const filters: Record<string, string> = {}
  
  for (const filter of allowedFilters) {
    const value = url.searchParams.get(filter)
    if (value) {
      filters[filter] = value
    }
  }
  
  return filters
}
