/**
 * GraphQL API Endpoint
 * POST /api/graphql - GraphQL endpoint
 * GET /api/graphql - GraphQL playground (development only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { typeDefs } from '@/lib/graphql/schema'
import { resolvers, createContext } from '@/lib/graphql/resolvers'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

// Simple GraphQL parser
function parseGraphQL(query: string): { operation: string; name: string; fields: string[] } | null {
  // Basic parsing - extract operation type and name
  const operationMatch = query.match(/^\s*(query|mutation)\s+(\w+)/)
  if (!operationMatch) return null
  
  return {
    operation: operationMatch[1],
    name: operationMatch[2],
    fields: [],
  }
}

// GraphQL execution
async function executeGraphQL(
  query: string,
  variables: Record<string, unknown> | undefined,
  context: Awaited<ReturnType<typeof createContext>>
): Promise<{ data?: unknown; errors?: Array<{ message: string }> }> {
  try {
    const parsed = parseGraphQL(query)
    
    if (!parsed) {
      return {
        errors: [{ message: 'Invalid GraphQL query format' }],
      }
    }
    
    const { operation, name } = parsed
    const resolverMap = operation === 'query' ? resolvers.Query : resolvers.Mutation
    const resolver = resolverMap?.[name as keyof typeof resolverMap]
    
    if (!resolver) {
      return {
        errors: [{ message: `Unknown ${operation}: ${name}` }],
      }
    }
    
    // Execute resolver
    // @ts-expect-error - Dynamic resolver call
    const result = await resolver(null, variables || {}, context)
    
    return { data: { [name]: result } }
    
  } catch (error) {
    console.error('GraphQL execution error:', error)
    return {
      errors: [{ message: error instanceof Error ? error.message : 'Internal server error' }],
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, variables, operationName } = body
    
    if (!query) {
      return NextResponse.json(
        { errors: [{ message: 'Missing query' }] },
        { status: 400 }
      )
    }
    
    // Create context with authentication
    const context = await createContext(request)
    
    // Execute GraphQL
    const result = await executeGraphQL(query, variables, context)
    
    // Check for authentication errors
    if (!context && result.errors?.some(e => e.message.includes('Unauthorized'))) {
      return NextResponse.json(
        { errors: [{ message: 'Unauthorized: Authentication required' }] },
        { status: 401 }
      )
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('GraphQL error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Internal server error' }] },
      { status: 500 }
    )
  }
}

// GraphQL Playground (development only)
export async function GET(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  
  if (!isDevelopment) {
    return errorResponse(
      ErrorCodes.NOT_FOUND,
      'GraphQL Playground is only available in development mode',
      undefined,
      404
    )
  }
  
  const playground = `
<!DOCTYPE html>
<html>
<head>
  <title>RelancePro Africa - GraphQL Playground</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
  <link rel="shortcut icon" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
  <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
</head>
<body>
  <div id="root">
    <style>
      body {
        background-color: #1a1a2e;
        color: #fff;
        font-family: 'Inter', sans-serif;
        margin: 0;
        padding: 20px;
      }
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
      .info {
        max-width: 800px;
        margin: 0 auto;
      }
      .endpoint-info {
        background: #16213e;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }
      code {
        background: #0f3460;
        padding: 2px 6px;
        border-radius: 4px;
      }
    </style>
    <div class="loading">
      <div class="info">
        <h1>RelancePro Africa GraphQL API</h1>
        <div class="endpoint-info">
          <p><strong>Endpoint:</strong> <code>/api/graphql</code></p>
          <p><strong>Authentication:</strong> Bearer token required</p>
          <p><strong>Header:</strong> <code>Authorization: Bearer YOUR_API_KEY</code></p>
        </div>
        <p>Loading GraphQL Playground...</p>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function(event) {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '/api/graphql',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY_HERE'
        },
        settings: {
          'editor.theme': 'dark',
          'editor.fontSize': 14,
          'request.credentials': 'include',
        }
      })
    })
  </script>
</body>
</html>
  `
  
  return new NextResponse(playground, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
