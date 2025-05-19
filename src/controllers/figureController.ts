import { Request, Response } from 'express';
import Figure, { IFigure } from '../models/Figure';
import mongoose from 'mongoose';
import axios from 'axios';
import cheerio from 'cheerio';

// Get all figures for the logged-in user with pagination
export const getFigures = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const figures = await Figure.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Figure.countDocuments({ userId });
    
    res.status(200).json({
      success: true,
      count: figures.length,
      page,
      pages: Math.ceil(total / limit),
      total,
      data: figures
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get a single figure by ID
export const getFigureById = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const figure = await Figure.findOne({
      _id: req.params.id,
      userId
    });
    
    if (!figure) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: figure
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Extract image from MyFigureCollection URL
const extractImageFromMFC = async (mfcLink: string): Promise<string | null> => {
  try {
    const response = await axios.get(mfcLink);
    const $ = cheerio.load(response.data);
    
    // This is a basic scraper - the actual selector may need adjustment
    const imageUrl = $('.headline + .container .item-picture img').attr('src');
    return imageUrl || null;
  } catch (error: any) {
    console.error(`Error extracting image from MFC: ${error.message}`);
    return null;
  }
};

// Create a new figure
export const createFigure = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { manufacturer, name, scale, mfcLink, location, boxNumber, imageUrl } = req.body;
    
    // Handle the image - either use the provided URL or try to extract from MFC
    let finalImageUrl = imageUrl;
    if (!finalImageUrl && mfcLink) {
      finalImageUrl = await extractImageFromMFC(mfcLink);
    }
    
    const figure = await Figure.create({
      manufacturer,
      name,
      scale,
      mfcLink,
      location,
      boxNumber,
      imageUrl: finalImageUrl,
      userId
    });
    
    res.status(201).json({
      success: true,
      data: figure
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update a figure
export const updateFigure = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { manufacturer, name, scale, mfcLink, location, boxNumber, imageUrl } = req.body;
    
    // Find figure and check ownership
    let figure = await Figure.findOne({
      _id: req.params.id,
      userId
    });
    
    if (!figure) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found or you do not have permission'
      });
    }
    
    // Handle the image - only try to extract if mfcLink changed and no imageUrl provided
    let finalImageUrl = imageUrl;
    if (!finalImageUrl && mfcLink && mfcLink !== figure.mfcLink) {
      finalImageUrl = await extractImageFromMFC(mfcLink);
    } else if (!finalImageUrl && !imageUrl) {
      finalImageUrl = figure.imageUrl; // Keep existing image
    }
    
    // Update figure
    figure = await Figure.findByIdAndUpdate(
      req.params.id,
      {
        manufacturer,
        name,
        scale,
        mfcLink,
        location,
        boxNumber,
        imageUrl: finalImageUrl
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: figure
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete a figure
export const deleteFigure = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Find figure and check ownership
    const figure = await Figure.findOne({
      _id: req.params.id,
      userId
    });
    
    if (!figure) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found or you do not have permission'
      });
    }
    
    // Delete from MongoDB
    await Figure.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Figure removed successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Search figures using MongoDB Atlas Search
export const searchFigures = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // MongoDB Atlas Search query
    const searchResults = await Figure.aggregate([
      {
        $search: {
          index: 'figures', // The name of your search index created in Atlas
          compound: {
            must: [
              {
                text: {
                  query: query as string,
                  path: ['manufacturer', 'name', 'location', 'boxNumber'],
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 2
                  }
                }
              }
            ],
            filter: [
              {
                equals: {
                  path: 'userId',
                  value: userId
                }
              }
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          manufacturer: 1,
          name: 1,
          scale: 1,
          mfcLink: 1,
          location: 1,
          boxNumber: 1,
          imageUrl: 1,
          userId: 1
        }
      }
    ]);
    
    // Transform to match expected API format
    const hits = searchResults.map(doc => ({
      id: doc._id,
      manufacturer: doc.manufacturer,
      name: doc.name,
      scale: doc.scale,
      mfcLink: doc.mfcLink,
      location: doc.location,
      boxNumber: doc.boxNumber,
      imageUrl: doc.imageUrl,
      userId: doc.userId
    }));
    
    res.status(200).json({
      success: true,
      count: hits.length,
      data: hits
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Advanced filter figures
export const filterFigures = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { manufacturer, scale, location, boxNumber } = req.query;
    
    const query: any = { userId };
    
    if (manufacturer) query.manufacturer = { $regex: manufacturer as string, $options: 'i' };
    if (scale) query.scale = scale;
    if (location) query.location = { $regex: location as string, $options: 'i' };
    if (boxNumber) query.boxNumber = boxNumber;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const figures = await Figure.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Figure.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: figures.length,
      page,
      pages: Math.ceil(total / limit),
      total,
      data: figures
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get statistics
export const getFigureStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Total count
    const totalCount = await Figure.countDocuments({ userId });
    
    // Count by manufacturer
    const manufacturerStats = await Figure.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$manufacturer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Count by scale
    const scaleStats = await Figure.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$scale', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Count by location
    const locationStats = await Figure.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalCount,
        manufacturerStats,
        scaleStats,
        locationStats
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
