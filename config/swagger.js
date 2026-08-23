const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MrHaile.com API',
      version: '1.0.0',
      description: 'Backend REST API documentation for MrHaile.com LMS and Digital Asset Hub. All endpoints, authentication, courses, assets, editing services, payments, and admin routes are fully documented.',
      contact: {
        name: 'API Support',
        email: 'support@mrhaile.com',
      },
    },
    servers: [
      {
        url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
        description: 'Current Environment API Server',
      },
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Invalid credentials or resource not found',
            },
            stack: {
              type: 'string',
              example: 'Error stack trace (development only)',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Validation failed',
            },
            errors: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['Email is required', 'Password must be at least 6 characters'],
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _Id: {
              type: 'string',
              example: '60d0fe4f5311236168a109ca',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'superadmin'],
              example: 'user',
            },
            isBlocked: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};

