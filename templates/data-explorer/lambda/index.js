const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  try {
    const path = event.path;
    const method = event.httpMethod;
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // Route to appropriate handler
    if (path === '/data' && method === 'GET') {
      return await handleGetData(event);
    } else if (path === '/data' && method === 'POST') {
      return await handlePostData(event);
    } else if (path === '/query' && method === 'POST') {
      return await handleQuery(event);
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleGetData(event) {
  const queryParams = event.queryStringParameters || {};
  const limit = parseInt(queryParams.limit) || 50;
  const lastKey = queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : undefined;
  
  const params = {
    TableName: TABLE_NAME,
    Limit: limit
  };
  
  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }
  
  const result = await dynamodb.scan(params).promise();
  
  const response = {
    items: result.Items,
    count: result.Count,
    scannedCount: result.ScannedCount
  };
  
  if (result.LastEvaluatedKey) {
    response.lastKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

async function handlePostData(event) {
  const body = JSON.parse(event.body);
  
  if (!body.id) {
    body.id = generateId();
  }
  
  if (!body.timestamp) {
    body.timestamp = Date.now();
  }
  
  const params = {
    TableName: TABLE_NAME,
    Item: body
  };
  
  await dynamodb.put(params).promise();
  
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Data created successfully',
      id: body.id
    })
  };
}

async function handleQuery(event) {
  const body = JSON.parse(event.body);
  const { queryType, parameters } = body;
  
  let params = {
    TableName: TABLE_NAME
  };
  
  switch (queryType) {
    case 'byId':
      params.Key = { id: parameters.id };
      const getResult = await dynamodb.get(params).promise();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          item: getResult.Item
        })
      };
      
    case 'byCategory':
      if (!parameters.category) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category is required' })
        };
      }
      
      params = {
        TableName: TABLE_NAME,
        IndexName: 'CategoryIndex',
        KeyConditionExpression: 'category = :category',
        ExpressionAttributeValues: {
          ':category': parameters.category
        },
        Limit: parameters.limit || 50
      };
      
      const queryResult = await dynamodb.query(params).promise();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          items: queryResult.Items,
          count: queryResult.Count
        })
      };
      
    case 'search':
      if (!parameters.searchTerm) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Search term is required' })
        };
      }
      
      params = {
        TableName: TABLE_NAME,
        FilterExpression: 'contains(#name, :searchTerm) OR contains(#desc, :searchTerm)',
        ExpressionAttributeNames: {
          '#name': 'name',
          '#desc': 'description'
        },
        ExpressionAttributeValues: {
          ':searchTerm': parameters.searchTerm
        },
        Limit: parameters.limit || 50
      };
      
      const scanResult = await dynamodb.scan(params).promise();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          items: scanResult.Items,
          count: scanResult.Count
        })
      };
      
    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid query type' })
      };
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}