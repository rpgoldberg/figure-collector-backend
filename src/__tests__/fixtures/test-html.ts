// Test HTML Fixtures for Web Scraping

export const MOCK_FIGURE_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="figure-container">
    <h1 class="figure-name">Test Figure</h1>
    <div class="figure-details">
      <span class="manufacturer">Test Manufacturer</span>
      <span class="release-date">2023-01-01</span>
      <span class="price">$99.99</span>
    </div>
  </div>
</body>
</html>
`;

export const EMPTY_HTML = `
<!DOCTYPE html>
<html>
<body>
  <!-- Intentionally empty for testing edge cases -->
</body>
</html>
`;

export const ERROR_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="error-page">Server Error</div>
</body>
</html>
`;