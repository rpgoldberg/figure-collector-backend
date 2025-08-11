import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as figureController from '../../src/controllers/figureController';
import Figure from '../../src/models/Figure';
import axios from 'axios';

// Mock Figure model
jest.mock('../../src/models/Figure');
const MockedFigure = jest.mocked(Figure);

// Mock axios
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('FigureController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<any>;

  beforeEach(() => {
    mockRequest = {
      user: { id: 'user123' },
      query: {},
      params: {},
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getFigures', () => {
    it('should get figures with default pagination', async () => {
      const mockFigures = [
        { _id: 'fig1', manufacturer: 'GSC', name: 'Miku', userId: 'user123' },
        { _id: 'fig2', manufacturer: 'Alter', name: 'Rin', userId: 'user123' }
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockFigures)
      };

      MockedFigure.find = jest.fn().mockReturnValue(mockFind);
      MockedFigure.countDocuments = jest.fn().mockResolvedValue(2);

      await figureController.getFigures(mockRequest as Request, mockResponse as Response);

      expect(MockedFigure.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockFind.skip).toHaveBeenCalledWith(0);
      expect(mockFind.limit).toHaveBeenCalledWith(10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        page: 1,
        pages: 1,
        total: 2,
        data: mockFigures
      });
    });

    it('should handle pagination parameters', async () => {
      mockRequest.query = { page: '2', limit: '5' };

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mkReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      MockedFigure.find = jest.fn().mockReturnValue(mockFind);
      MockedFigure.countDocuments = jest.fn().mockResolvedValue(15);

      await figureController.getFigures(mockRequest as Request, mockResponse as Response);

      expect(mockFind.skip).toHaveBeenCalledWith(5); // (2-1) * 5
      expect(mockFind.limit).toHaveBeenCalledWith(5);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pages: 3,
          total: 15
        })
      );
    });

    it('should handle server errors', async () => {
      MockedFigure.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await figureController.getFigures(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Database error'
      });
    });
  });

  describe('getFigureById', () => {
    it('should get figure by id successfully', async () => {
      const mockFigure = {
        _id: 'fig123',
        manufacturer: 'GSC',
        name: 'Miku',
        userId: 'user123'
      };

      mockRequest.params = { id: 'fig123' };
      MockedFigure.findOne = jest.fn().mockResolvedValue(mockFigure);

      await figureController.getFigureById(mockRequest as Request, mockResponse as Response);

      expect(MockedFigure.findOne).toHaveBeenCalledWith({
        _id: 'fig123',
        userId: 'user123'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockFigure
      });
    });

    it('should return 404 if figure not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      MockedFigure.findOne = jest.fn().mockResolvedValue(null);

      await figureController.getFigureById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Figure not found'
      });
    });
  });

  describe('createFigure', () => {
    it('should create figure successfully without scraping', async () => {
      mockRequest.body = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        location: 'Shelf A',
        boxNumber: 'Box 1'
      };

      const mockCreatedFigure = {
        _id: 'fig123',
        ...mockRequest.body,
        userId: 'user123'
      };

      MockedFigure.create = jest.fn().mockResolvedValue(mockCreatedFigure);

      await figureController.createFigure(mockRequest as Request, mockResponse as Response);

      expect(MockedFigure.create).toHaveBeenCalledWith({
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        mfcLink: '',
        location: 'Shelf A',
        boxNumber: 'Box 1',
        imageUrl: undefined,
        userId: 'user123'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedFigure
      });
    });

    it('should create figure with MFC scraping', async () => {
      mockRequest.body = {
        manufacturer: '',
        name: '',
        mfcLink: 'https://myfigurecollection.net/item/12345'
      };

      const mockScrapedData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        imageUrl: 'https://example.com/image.jpg'
      };

      const mockCreatedFigure = {
        _id: 'fig123',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        mfcLink: 'https://myfigurecollection.net/item/12345',
        imageUrl: 'https://example.com/image.jpg',
        userId: 'user123'
      };

      // Mock scraper service call
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: mockScrapedData
        }
      });

      MockedFigure.create = jest.fn().mockResolvedValue(mockCreatedFigure);

      await figureController.createFigure(mockRequest as Request, mockResponse as Response);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://page-scraper-dev:3000/scrape/mfc',
        { url: 'https://myfigurecollection.net/item/12345' },
        expect.any(Object)
      );
      expect(MockedFigure.create).toHaveBeenCalledWith({
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        mfcLink: 'https://myfigurecollection.net/item/12345',
        location: '',
        boxNumber: '',
        imageUrl: 'https://example.com/image.jpg',
        userId: 'user123'
      });
    });

    it('should handle scraping service failure with fallback', async () => {
      mockRequest.body = {
        manufacturer: '',
        name: '',
        mfcLink: 'https://myfigurecollection.net/item/12345'
      };

      // Mock scraper service failure
      mockedAxios.post = jest.fn().mockRejectedValue(new Error('Service down'));

      // Mock fallback axios call
      mockedAxios.get = jest.fn().mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: '<html><div class="item-picture"><div class="main"><img src="https://example.com/image.jpg"></div></div></html>'
      });

      const mockCreatedFigure = {
        _id: 'fig123',
        manufacturer: '',
        name: '',
        mfcLink: 'https://myfigurecollection.net/item/12345',
        userId: 'user123'
      };

      MockedFigure.create = jest.fn().mockResolvedValue(mockCreatedFigure);

      await figureController.createFigure(mockRequest as Request, mockResponse as Response);

      expect(mockedAxios.post).toHaveBeenCalled();
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  describe('updateFigure', () => {
    it('should update figure successfully', async () => {
      mockRequest.params = { id: 'fig123' };
      mockRequest.body = {
        manufacturer: 'Updated Manufacturer',
        name: 'Updated Name',
        scale: '1/7'
      };

      const mockExistingFigure = {
        _id: 'fig123',
        manufacturer: 'Old Manufacturer',
        name: 'Old Name',
        userId: 'user123',
        mfcLink: ''
      };

      const mockUpdatedFigure = {
        _id: 'fig123',
        manufacturer: 'Updated Manufacturer',
        name: 'Updated Name',
        scale: '1/7',
        userId: 'user123'
      };

      MockedFigure.findOne = jest.fn().mockResolvedValue(mockExistingFigure);
      MockedFigure.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedFigure);

      await figureController.updateFigure(mockRequest as Request, mockResponse as Response);

      expect(MockedFigure.findOne).toHaveBeenCalledWith({
        _id: 'fig123',
        userId: 'user123'
      });
      expect(MockedFigure.findByIdAndUpdate).toHaveBeenCalledWith(
        'fig123',
        expect.objectContaining({
          manufacturer: 'Updated Manufacturer',
          name: 'Updated Name',
          scale: '1/7'
        }),
        { new: true }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedFigure
      });
    });

    it('should return 404 if figure not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      MockedFigure.findOne = jest.fn().mockResolvedValue(null);

      await figureController.updateFigure(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Figure not found or you do not have permission'
      });
    });
  });

  describe('deleteFigure', () => {
    it('should delete figure successfully', async () => {
      mockRequest.params = { id: 'fig123' };

      const mockFigure = {
        _id: 'fig123',
        manufacturer: 'GSC',
        name: 'Miku',
        userId: 'user123'
      };

      MockedFigure.findOne = jest.fn().mockResolvedValue(mockFigure);
      MockedFigure.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await figureController.deleteFigure(mockRequest as Request, mockResponse as Response);

      expect(MockedFigure.findOne).toHaveBeenCalledWith({
        _id: 'fig123',
        userId: 'user123'
      });
      expect(MockedFigure.deleteOne).toHaveBeenCalledWith({ _id: 'fig123' });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Figure removed successfully'
      });
    });

    it('should return 404 if figure not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      MockedFigure.findOne = jest.fn().mockResolvedValue(null);

      await figureController.deleteFigure(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Figure not found or you do not have permission'
      });
    });
  });

  describe('scrapeMFCData', () => {
    it('should scrape MFC data successfully', async () => {
      mockRequest.body = {
        mfcLink: 'https://myfigurecollection.net/item/12345'
      };

      const mockScrapedData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        imageUrl: 'https://example.com/image.jpg'
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: mockScrapedData
        }
      });

      await figureController.scrapeMFCData(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockScrapedData
      });
    });

    it('should return error for missing MFC link', async () => {
      mockRequest.body = {};

      await figureController.scrapeMFCData(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'MFC link is required'
      });
    });

    it('should return error for invalid URL', async () => {
      mockRequest.body = {
        mfcLink: 'not-a-valid-url'
      };

      await figureController.scrapeMFCData(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid URL format'
      });
    });

    it('should return error for non-MFC URL', async () => {
      mockRequest.body = {
        mfcLink: 'https://example.com/item/12345'
      };

      await figureController.scrapeMFCData(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'URL must be from myfigurecollection.net'
      });
    });
  });

  describe('searchFigures', () => {
    it('should search figures using MongoDB Atlas Search', async () => {
      mockRequest.query = { query: 'Miku' };

      const mockSearchResults = [
        {
          _id: 'fig1',
          manufacturer: 'GSC',
          name: 'Hatsune Miku',
          userId: new mongoose.Types.ObjectId('user123')
        }
      ];

      MockedFigure.aggregate = jest.fn().mockResolvedValue(mockSearchResults);

      await figureController.searchFigures(mockRequest as Request, mockResponse as Response);

      expect(MockedFigure.aggregate).toHaveBeenCalledWith([
        {
          $search: {
            index: 'figures',
            compound: {
              must: [{
                text: {
                  query: 'Miku',
                  path: ['manufacturer', 'name', 'location', 'boxNumber'],
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 2
                  }
                }
              }],
              filter: [{
                equals: {
                  path: 'userId',
                  value: expect.any(mongoose.Types.ObjectId)
                }
              }]
            }
          }
        },
        expect.any(Object)
      ]);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        data: expect.any(Array)
      });
    });

    it('should return error if query parameter is missing', async () => {
      mockRequest.query = {};

      await figureController.searchFigures(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required'
      });
    });
  });

  describe('filterFigures', () => {
    it('should filter figures with multiple criteria', async () => {
      mockRequest.query = {
        manufacturer: 'GSC',
        scale: '1/8',
        location: 'Shelf',
        page: '1',
        limit: '10'
      };

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      MockedFigure.find = jest.fn().mockReturnValue(mockFind);
      MockedFigure.countDocuments = jest.fn().mockResolvedValue(5);

      await figureController.filterFigures(mockRequest as Request, mockResponse as Response);

      expect(MockedFigure.find).toHaveBeenCalledWith({
        userId: 'user123',
        manufacturer: { $regex: 'GSC', $options: 'i' },
        scale: '1/8',
        location: { $regex: 'Shelf', $options: 'i' }
      });
    });
  });

  describe('getFigureStats', () => {
    it('should return figure statistics', async () => {
      const mockStatsResults = [
        { _id: 'GSC', count: 5 },
        { _id: 'Alter', count: 3 }
      ];

      MockedFigure.countDocuments = jest.fn().mockResolvedValue(8);
      MockedFigure.aggregate = jest.fn()
        .mockResolvedValueOnce(mockStatsResults) // manufacturer stats
        .mockResolvedValueOnce([{ _id: '1/8', count: 6 }]) // scale stats
        .mockResolvedValueOnce([{ _id: 'Shelf A', count: 4 }]); // location stats

      await figureController.getFigureStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalCount: 8,
          manufacturerStats: mockStatsResults,
          scaleStats: [{ _id: '1/8', count: 6 }],
          locationStats: [{ _id: 'Shelf A', count: 4 }]
        }
      });
    });
  });
});