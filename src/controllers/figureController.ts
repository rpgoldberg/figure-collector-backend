import { Request, Response } from 'express';
import Figure, { IFigure } from '../models/Figure';
import mongoose from 'mongoose';
import axios from 'axios';
import cheerio from 'cheerio';

interface MFCScrapedData {
  imageUrl?: string;
  manufacturer?: string;
  name?: string;
  scale?: string;
}

// Enhanced MFC scraping function
const scrapeDataFromMFC = async (mfcLink: string): Promise<MFCScrapedData> => {
  try {
    const response = await axios.get(mfcLink, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const scrapedData: MFCScrapedData = {};
    
    // Scrape image URL from main item-picture
    const imageElement = $('.item-picture .main img').first();
    if (imageElement.length) {
      scrapedData.imageUrl = imageElement.attr('src');
    }
    
    // Scrape manufacturer from span with switch attribute
    const manufacturerSpan = $('span[switch]').first();
    if (manufacturerSpan.length) {
      scrapedData.manufacturer = manufacturerSpan.text().trim();
    }
    
    // Scrape name - look for span with Japanese characters (second span with switch)
    const nameSpan = $('span[switch]').eq(1);
    if (nameSpan.length) {
      scrapedData.name = nameSpan.text().trim();
    }
    
    // Scrape scale from item-scale class
    const scaleElement = $('.item-scale a[title="Scale"]');
    if (scaleElement.length) {
      // Get text content and remove <small> tags
      let scaleText = scaleElement.text().trim();
      scrapedData.scale = scaleText;
    }
    
    console.log('MFC Scraping results:', scrapedData);
    return scrapedData;
    
  } catch (error) {
    console.error(`Error scraping MFC data: ${error.message}`);
    return {};
  }
};

// New endpoint for frontend to call when MFC link changes
export const scrapeMFCData = async (req: Request, res: Response) => {
  try {
    const { mfcLink } = req.body;
    
    if (!mfcLink) {
      return res.status(400).json({
        success: false,
        message: 'MFC link is required'
      });
    }
    
    const scrapedData = await scrapeDataFromMFC(mfcLink);
    
    res.status(200).json({
      success: true,
      data: scrapedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

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

// Updated createFigure with enhanced scraping
export const createFigure = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { manufacturer, name, scale, mfcLink, location, boxNumber, imageUrl } = req.body;
    
    // Start with provided data
    let finalData = {
      manufacturer,
      name,
      scale,
      imageUrl,
      location: location || '', // Allow empty strings
      boxNumber: boxNumber || '' // Allow empty strings
    };
    
    // If MFC link is provided, scrape missing data
    if (mfcLink && mfcLink.trim()) {
      const scrapedData = await scrapeDataFromMFC(mfcLink);
      
      // Only use scraped data if the field is empty
      if (!finalData.imageUrl && scrapedData.imageUrl) {
        finalData.imageUrl = scrapedData.imageUrl;
      }
      if (!finalData.manufacturer && scrapedData.manufacturer) {
        finalData.manufacturer = scrapedData.manufacturer;
      }
      if (!finalData.name && scrapedData.name) {
        finalData.name = scrapedData.name;
      }
      if (!finalData.scale && scrapedData.scale) {
        finalData.scale = scrapedData.scale;
      }
    }
    
    const figure = await Figure.create({
      manufacturer: finalData.manufacturer,
      name: finalData.name,
      scale: finalData.scale,
      mfcLink || '',
      location: finalData.location,
      boxNumber: finalData.boxNumber,
      imageUrl: finalData.imageUrl,
      userId
    });
    
    res.status(201).json({
      success: true,
      data: figure
    });
  } catch (error) {
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
    
    let finalData = {
      manufacturer,
      name,
      scale,
      imageUrl,
      location: location || '',
      boxNumber: boxNumber || ''
    };

    // Only scrape if MFC link is provided, not empty, and different from existing
    if (mfcLink && mfcLink.trim() && mfcLink.trim() !== figure.mfcLink) {
      const scrapedData = await scrapeDataFromMFC(mfcLink.trim());

      // Only use scraped data if the field is empty
      if (!finalData.imageUrl && scrapedData.imageUrl) {
        finalData.imageUrl = scrapedData.imageUrl;
      }
      if (!finalData.manufacturer && scrapedData.manufacturer) {
        finalData.manufacturer = scrapedData.manufacturer;
      }
      if (!finalData.name && scrapedData.name) {
        finalData.name = scrapedData.name;
      }
      if (!finalData.scale && scrapedData.scale) {
        finalData.scale = scrapedData.scale;
      }
    } else if (!imageUrl && !mfcLink) {
      // Keep existing image if no new image URL and no MFC link
      finalData.imageUrl = figure.imageUrl;
    }
    
    // Update figure
    figure = await Figure.findByIdAndUpdate(
      req.params.id,
      {
	manufacturer: finalData.manufacturer,
        name: finalData.name,
        scale: finalData.scale,
        mfcLink: mfcLink || '', // Allow empty string
        location: finalData.location,
        boxNumber: finalData.boxNumber,
        imageUrl: finalData.imageUrl
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

    // Convert userId to ObjectId for the filter
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
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
                  value: userObjectId // Use ObjectId instead of string
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
