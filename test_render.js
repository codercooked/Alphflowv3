import fs from 'fs';
import { transformSync } from '@babel/core';

const code = fs.readFileSync('alphaflow/web_platform/frontend/src/pages/StockAnalysisPage.jsx', 'utf8');
const transformed = transformSync(code, {
  presets: ['@babel/preset-react'],
  plugins: ['@babel/plugin-syntax-jsx']
});
// Actually, setting up a full React test environment in a script might take a while because of imports.
