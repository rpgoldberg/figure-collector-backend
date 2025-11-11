import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { wordWheelSearch, partialSearch } from '../services/searchService';

/**
 * Get autocomplete suggestions for word wheel search
 * GET /api/search/suggestions?q=<query>&limit=<number>
 */
export const getSuggestions = async (req: Request, res: Response) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const query = req.query.q as string;
    const limitParam = req.query.limit as string;

    // Validate query parameter
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }

    // Validate minimum query length
    if (query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters'
      });
    }

    // Validate and parse limit
    let limit = 10; // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be a positive integer'
        });
      }
      // Enforce maximum limit
      limit = Math.min(parsedLimit, 50);
    }

    // Call search service
    const results = await wordWheelSearch(query, userId, limit);

    return res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error: any) {
    console.error('[SEARCH CONTROLLER] Error in getSuggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching search suggestions'
    });
  }
};

/**
 * Get partial word matches
 * GET /api/search/partial?q=<query>&limit=<number>&offset=<number>
 */
export const getPartialMatches = async (req: Request, res: Response) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const query = req.query.q as string;
    const limitParam = req.query.limit as string;
    const offsetParam = req.query.offset as string;

    // Validate query parameter
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }

    // Validate minimum query length
    if (query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters'
      });
    }

    // Validate and parse limit
    let limit = 10; // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be a positive integer'
        });
      }
      // Enforce maximum limit
      limit = Math.min(parsedLimit, 50);
    }

    // Validate and parse offset
    let offset = 0; // default
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          message: 'Offset must be a non-negative integer'
        });
      }
      offset = parsedOffset;
    }

    // Call search service
    const results = await partialSearch(query, userId, { limit, offset });

    return res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error: any) {
    console.error('[SEARCH CONTROLLER] Error in getPartialMatches:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching partial matches'
    });
  }
};
