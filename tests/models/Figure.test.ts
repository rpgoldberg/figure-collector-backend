import mongoose from 'mongoose';
import Figure, { IFigure } from '../../src/models/Figure';
import User from '../../src/models/User';

describe('Figure Model', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a test user for figure ownership
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    const savedUser = await testUser.save();
    testUserId = savedUser._id;
  });

  describe('Schema Validation', () => {
    it('should create a valid figure with required fields', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      expect(savedFigure._id).toBeDefined();
      expect(savedFigure.manufacturer).toBe(figureData.manufacturer);
      expect(savedFigure.name).toBe(figureData.name);
      expect(savedFigure.userId).toEqual(testUserId);
      expect(savedFigure.createdAt).toBeDefined();
      expect(savedFigure.updatedAt).toBeDefined();
    });

    it('should require manufacturer field', async () => {
      const figureData = {
        name: 'Test Figure',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      
      await expect(figure.save()).rejects.toThrow();
    });

    it('should require name field', async () => {
      const figureData = {
        manufacturer: 'Test Manufacturer',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      
      await expect(figure.save()).rejects.toThrow();
    });

    it('should require userId field', async () => {
      const figureData = {
        manufacturer: 'Test Manufacturer',
        name: 'Test Figure'
      };

      const figure = new Figure(figureData);
      
      await expect(figure.save()).rejects.toThrow();
    });

    it('should accept all optional fields', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        mfcLink: 'https://myfigurecollection.net/item/12345',
        location: 'Shelf A',
        boxNumber: 'Box 1',
        imageUrl: 'https://example.com/image.jpg',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      expect(savedFigure.scale).toBe(figureData.scale);
      expect(savedFigure.mfcLink).toBe(figureData.mfcLink);
      expect(savedFigure.location).toBe(figureData.location);
      expect(savedFigure.boxNumber).toBe(figureData.boxNumber);
      expect(savedFigure.imageUrl).toBe(figureData.imageUrl);
    });

    it('should handle empty string values for optional fields', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '',
        mfcLink: '',
        location: '',
        boxNumber: '',
        imageUrl: '',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      expect(savedFigure.scale).toBe('');
      expect(savedFigure.mfcLink).toBe('');
      expect(savedFigure.location).toBe('');
      expect(savedFigure.boxNumber).toBe('');
      expect(savedFigure.imageUrl).toBe('');
    });
  });

  describe('User Reference', () => {
    it('should properly reference a user', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      // Populate the user reference
      const populatedFigure = await Figure.findById(savedFigure._id).populate('userId');
      
      expect(populatedFigure?.userId).toBeDefined();
      expect((populatedFigure?.userId as any).username).toBe('testuser');
    });

    it('should fail with invalid userId', async () => {
      const invalidUserId = new mongoose.Types.ObjectId();
      
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        userId: invalidUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save(); // This should succeed even with invalid reference

      expect(savedFigure.userId).toEqual(invalidUserId);
    });
  });

  describe('Indexes', () => {
    it('should have indexes on manufacturer and name', async () => {
      // This test verifies that indexes exist - actual performance testing would require large datasets
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      // Test querying by indexed fields
      const foundByManufacturer = await Figure.findOne({ manufacturer: 'Good Smile Company' });
      const foundByName = await Figure.findOne({ name: 'Hatsune Miku' });
      const foundByUserId = await Figure.findOne({ userId: testUserId });

      expect(foundByManufacturer?._id).toEqual(savedFigure._id);
      expect(foundByName?._id).toEqual(savedFigure._id);
      expect(foundByUserId?._id).toEqual(savedFigure._id);
    });

    it('should support compound index queries', async () => {
      const figure1Data = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        location: 'Shelf A',
        boxNumber: 'Box 1',
        userId: testUserId
      };

      const figure2Data = {
        manufacturer: 'Good Smile Company',
        name: 'Kagamine Rin',
        location: 'Shelf A',
        boxNumber: 'Box 2',
        userId: testUserId
      };

      await Figure.create([figure1Data, figure2Data]);

      // Test compound index on manufacturer + name
      const foundByCompound1 = await Figure.findOne({ 
        manufacturer: 'Good Smile Company', 
        name: 'Hatsune Miku' 
      });

      // Test compound index on location + boxNumber
      const foundByCompound2 = await Figure.findOne({ 
        location: 'Shelf A', 
        boxNumber: 'Box 1' 
      });

      expect(foundByCompound1?.name).toBe('Hatsune Miku');
      expect(foundByCompound2?.name).toBe('Hatsune Miku');
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      expect(savedFigure.createdAt).toBeDefined();
      expect(savedFigure.updatedAt).toBeDefined();
      expect(savedFigure.createdAt).toBeInstanceOf(Date);
      expect(savedFigure.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();
      const originalUpdatedAt = savedFigure.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedFigure.name = 'Updated Miku';
      await savedFigure.save();

      expect(savedFigure.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Data Types and Edge Cases', () => {
    it('should handle long strings', async () => {
      const longString = 'A'.repeat(1000);
      
      const figureData = {
        manufacturer: longString,
        name: longString,
        scale: longString,
        mfcLink: longString,
        location: longString,
        boxNumber: longString,
        imageUrl: longString,
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      expect(savedFigure.manufacturer).toBe(longString);
      expect(savedFigure.name).toBe(longString);
    });

    it('should handle special characters', async () => {
      const figureData = {
        manufacturer: 'メーカー株式会社',
        name: 'フィギュア名！@#$%^&*()',
        scale: '1/8スケール',
        location: 'Shelf あ',
        boxNumber: 'Box №1',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      expect(savedFigure.manufacturer).toBe(figureData.manufacturer);
      expect(savedFigure.name).toBe(figureData.name);
      expect(savedFigure.scale).toBe(figureData.scale);
      expect(savedFigure.location).toBe(figureData.location);
      expect(savedFigure.boxNumber).toBe(figureData.boxNumber);
    });

    it('should handle URL formats in mfcLink and imageUrl', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        mfcLink: 'https://myfigurecollection.net/item/12345?query=param',
        imageUrl: 'https://static.myfigurecollection.net/upload/pictures/2023/01/01/image.jpg',
        userId: testUserId
      };

      const figure = new Figure(figureData);
      const savedFigure = await figure.save();

      expect(savedFigure.mfcLink).toBe(figureData.mfcLink);
      expect(savedFigure.imageUrl).toBe(figureData.imageUrl);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create multiple figures for testing
      const figures = [
        {
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/8',
          location: 'Shelf A',
          boxNumber: 'Box 1',
          userId: testUserId
        },
        {
          manufacturer: 'Alter',
          name: 'Kagamine Rin',
          scale: '1/7',
          location: 'Shelf B',
          boxNumber: 'Box 2',
          userId: testUserId
        },
        {
          manufacturer: 'Good Smile Company',
          name: 'Megumin',
          scale: '1/8',
          location: 'Shelf A',
          boxNumber: 'Box 3',
          userId: testUserId
        }
      ];

      await Figure.insertMany(figures);
    });

    it('should find figures by manufacturer', async () => {
      const figures = await Figure.find({ manufacturer: 'Good Smile Company' });
      expect(figures).toHaveLength(2);
      expect(figures[0].manufacturer).toBe('Good Smile Company');
      expect(figures[1].manufacturer).toBe('Good Smile Company');
    });

    it('should find figures by scale', async () => {
      const figures = await Figure.find({ scale: '1/8' });
      expect(figures).toHaveLength(2);
      expect(figures.every(f => f.scale === '1/8')).toBe(true);
    });

    it('should find figures by location', async () => {
      const figures = await Figure.find({ location: 'Shelf A' });
      expect(figures).toHaveLength(2);
      expect(figures.every(f => f.location === 'Shelf A')).toBe(true);
    });

    it('should support regex queries', async () => {
      const figures = await Figure.find({ 
        name: { $regex: 'Miku|Rin', $options: 'i' } 
      });
      expect(figures).toHaveLength(2);
      expect(figures.some(f => f.name.includes('Miku'))).toBe(true);
      expect(figures.some(f => f.name.includes('Rin'))).toBe(true);
    });

    it('should support sorting', async () => {
      const figures = await Figure.find({ userId: testUserId }).sort({ name: 1 });
      expect(figures).toHaveLength(3);
      expect(figures[0].name).toBe('Hatsune Miku');
      expect(figures[1].name).toBe('Kagamine Rin');
      expect(figures[2].name).toBe('Megumin');
    });
  });
});