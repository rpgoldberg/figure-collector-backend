import { Request, Response } from 'express';
import Figure, { IFigure } from '../models/Figure';
import mongoose from 'mongoose';
import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface MFCScrapedData {
  imageUrl?: string;
  manufacturer?: string;
  name?: string;
  scale?: string;
}

// Puppeteer-based MFC scraping function
const scrapeDataFromMFCWithPuppeteer = async (mfcLink: string): Promise<MFCScrapedData> => {
  console.log(`[MFC PUPPETEER] Starting scrape for URL: ${mfcLink}`);
  
  let browser;
  try {
    console.log('[MFC PUPPETEER] Launching browser...');
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ],
      timeout: 30000
    });

    console.log('[MFC PUPPETEER] Browser launched successfully');
    const page = await browser.newPage();
    console.log('[MFC PUPPETEER] New page created');
    
    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
    console.log('[MFC PUPPETEER] Page configured');
    
    console.log('[MFC PUPPETEER] Navigating to page...');
    
    try {
      // Navigate with longer timeout and wait for network to be idle
      await page.goto(mfcLink, { 
        waitUntil: 'domcontentloaded', // Changed from networkidle2 to be more reliable
        timeout: 30000 
      });
      console.log('[MFC PUPPETEER] Page navigation completed');
      
      // Wait a bit for any dynamic content to load
      await page.waitForTimeout(3000);
      console.log('[MFC PUPPETEER] Wait period completed, extracting data...');
    } catch (navError: any) {
      console.error('[MFC PUPPETEER] Navigation error:', navError.message);
      throw navError;
    }
    
    // Extract data using page.evaluate
    const scrapedData = await page.evaluate(() => {
      const data: any = {};
      
      // Try to find image
      const imageElement = document.querySelector('.item-picture .main img');
      if (imageElement) {
        data.imageUrl = imageElement.getAttribute('src');
      }
      
      // Try to find manufacturer
      const manufacturerSpan = document.querySelector('span[switch]');
      if (manufacturerSpan) {
        data.manufacturer = manufacturerSpan.textContent?.trim();
      }
      
      // Try to find name (second span with switch)
      const nameSpans = document.querySelectorAll('span[switch]');
      if (nameSpans.length > 1) {
        data.name = nameSpans[1].textContent?.trim();
      }
      
      // Try to find scale
      const scaleElement = document.querySelector('.item-scale a[title="Scale"]');
      if (scaleElement) {
        data.scale = scaleElement.textContent?.trim();
      }
      
      return data;
    });
    
    console.log('[MFC PUPPETEER] Extraction completed:', scrapedData);
    return scrapedData;
    
  } catch (error: any) {
    console.error(`[MFC PUPPETEER] Error: ${error.message}`);
    return {};
  } finally {
    if (browser) {
      await browser.close();
      console.log('[MFC PUPPETEER] Browser closed');
    }
  }
};

// Fallback axios-based MFC scraping function
const scrapeDataFromMFCWithAxios = async (mfcLink: string): Promise<MFCScrapedData> => {
  console.log(`[MFC SCRAPER] Starting scrape for URL: ${mfcLink}`);
  
  try {
    console.log('[MFC SCRAPER] Making HTTP request...');
    const response = await axios.get(mfcLink, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 15000, // 15 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Accept redirects and client errors
    });
    
    console.log(`[MFC SCRAPER] HTTP Response Status: ${response.status}`);
    console.log(`[MFC SCRAPER] Response Content-Type: ${response.headers['content-type']}`);
    console.log(`[MFC SCRAPER] Response data length: ${response.data ? response.data.length : 'undefined'}`);
    
    if (!response.data) {
      console.error('[MFC SCRAPER] No response data received');
      return {};
    }
    
    // Check if we got a Cloudflare challenge page
    if (response.data.includes('Just a moment...') || response.data.includes('cf-challenge') || response.status === 403) {
      console.error('[MFC SCRAPER] Detected Cloudflare challenge or 403 - scraping blocked');
      console.log('[MFC SCRAPER] Response contains Cloudflare protection. This may require manual extraction.');
      return {};
    }
    
    console.log('[MFC SCRAPER] Loading HTML with cheerio...');
    const $ = cheerio.load(response.data);
    const scrapedData: MFCScrapedData = {};
    
    console.log(`[MFC SCRAPER] HTML loaded successfully, document length: ${$.html().length}`);
    
    // Scrape image URL from main item-picture
    console.log('[MFC SCRAPER] Looking for image element...');
    const imageElement = $('.item-picture .main img').first();
    console.log(`[MFC SCRAPER] Found ${$('.item-picture').length} .item-picture elements`);
    console.log(`[MFC SCRAPER] Found ${$('.item-picture .main').length} .item-picture .main elements`);
    console.log(`[MFC SCRAPER] Found ${imageElement.length} image elements in .item-picture .main`);
    if (imageElement.length) {
      scrapedData.imageUrl = imageElement.attr('src');
      console.log(`[MFC SCRAPER] Image URL found: ${scrapedData.imageUrl}`);
    } else {
      console.log('[MFC SCRAPER] No image element found');
    }
    
    // Scrape manufacturer from span with switch attribute
    console.log('[MFC SCRAPER] Looking for manufacturer span...');
    const manufacturerSpan = $('span[switch]').first();
    console.log(`[MFC SCRAPER] Found ${$('span[switch]').length} span[switch] elements`);
    if (manufacturerSpan.length) {
      scrapedData.manufacturer = manufacturerSpan.text().trim();
      console.log(`[MFC SCRAPER] Manufacturer found: ${scrapedData.manufacturer}`);
    } else {
      console.log('[MFC SCRAPER] No manufacturer span found');
    }
    
    // Scrape name - look for span with Japanese characters (second span with switch)
    console.log('[MFC SCRAPER] Looking for name span...');
    const nameSpan = $('span[switch]').eq(1);
    if (nameSpan.length) {
      scrapedData.name = nameSpan.text().trim();
      console.log(`[MFC SCRAPER] Name found: ${scrapedData.name}`);
    } else {
      console.log('[MFC SCRAPER] No name span found');
    }
    
    // Scrape scale from item-scale class
    console.log('[MFC SCRAPER] Looking for scale element...');
    const scaleElement = $('.item-scale a[title="Scale"]');
    console.log(`[MFC SCRAPER] Found ${$('.item-scale').length} .item-scale elements`);
    console.log(`[MFC SCRAPER] Found ${$('.item-scale a').length} .item-scale a elements`);
    console.log(`[MFC SCRAPER] Found ${scaleElement.length} .item-scale a[title="Scale"] elements`);
    if (scaleElement.length) {
      let scaleText = scaleElement.text().trim();
      scrapedData.scale = scaleText;
      console.log(`[MFC SCRAPER] Scale found: ${scrapedData.scale}`);
    } else {
      console.log('[MFC SCRAPER] No scale element found');
    }
    
    console.log('[MFC SCRAPER] Final scraping results:', scrapedData);
    return scrapedData;
    
  } catch (error: any) {
    console.error(`[MFC SCRAPER] Error scraping MFC data: ${error.message}`);
    console.error(`[MFC SCRAPER] Error details:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers
    });
    
    if (error.response) {
      console.error(`[MFC SCRAPER] Error response data (first 500 chars):`, 
        error.response.data ? error.response.data.toString().substring(0, 500) : 'No response data');
    }
    
    return {};
  }
};

// Main scraping function that tries multiple approaches
const scrapeDataFromMFC = async (mfcLink: string): Promise<MFCScrapedData> => {
  console.log(`[MFC MAIN] Starting scrape process for: ${mfcLink}`);
  
  // First try Puppeteer (best for Cloudflare)
  try {
    console.log('[MFC MAIN] Attempting Puppeteer scraping...');
    const puppeteerResult = await scrapeDataFromMFCWithPuppeteer(mfcLink);
    
    // Check if we got meaningful data
    if (puppeteerResult.imageUrl || puppeteerResult.manufacturer || puppeteerResult.name) {
      console.log('[MFC MAIN] Puppeteer scraping successful');
      return puppeteerResult;
    } else {
      console.log('[MFC MAIN] Puppeteer returned empty data, trying fallback...');
    }
  } catch (error: any) {
    console.error('[MFC MAIN] Puppeteer failed:', error.message);
  }
  
  // Fallback to axios (might work if Cloudflare isn't active)
  try {
    console.log('[MFC MAIN] Attempting axios fallback...');
    const axiosResult = await scrapeDataFromMFCWithAxios(mfcLink);
    
    if (axiosResult.imageUrl || axiosResult.manufacturer || axiosResult.name) {
      console.log('[MFC MAIN] Axios fallback successful');
      return axiosResult;
    }
  } catch (error: any) {
    console.error('[MFC MAIN] Axios fallback failed:', error.message);
  }
  
  console.log('[MFC MAIN] All scraping methods failed');
  return {};
};

// New endpoint for frontend to call when MFC link changes
export const scrapeMFCData = async (req: Request, res: Response) => {
  console.log('[MFC ENDPOINT] Received scrape request');
  console.log('[MFC ENDPOINT] Request body:', req.body);
  console.log('[MFC ENDPOINT] Request headers:', req.headers);
  
  try {
    const { mfcLink } = req.body;
    
    if (!mfcLink) {
      console.log('[MFC ENDPOINT] No MFC link provided in request');
      return res.status(400).json({
        success: false,
        message: 'MFC link is required'
      });
    }
    
    console.log(`[MFC ENDPOINT] Processing MFC link: ${mfcLink}`);
    
    // Validate URL format
    try {
      new URL(mfcLink);
      console.log('[MFC ENDPOINT] URL format validation passed');
    } catch (urlError) {
      console.log('[MFC ENDPOINT] Invalid URL format:', urlError);
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }
    
    // Check if it's an MFC URL
    if (!mfcLink.includes('myfigurecollection.net')) {
      console.log('[MFC ENDPOINT] URL is not from myfigurecollection.net');
      return res.status(400).json({
        success: false,
        message: 'URL must be from myfigurecollection.net'
      });
    }
    
    console.log('[MFC ENDPOINT] Starting scraping process...');
    const scrapedData = await scrapeDataFromMFC(mfcLink);
    console.log('[MFC ENDPOINT] Scraping completed, data:', scrapedData);
    
    res.status(200).json({
      success: true,
      data: scrapedData
    });
  } catch (error: any) {
    console.error('[MFC ENDPOINT] Error in scrapeMFCData:', error);
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
      mfcLink: mfcLink || '', //allow empty string
      location: finalData.location,
      boxNumber: finalData.boxNumber,
      imageUrl: finalData.imageUrl,
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
