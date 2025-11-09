// Vercel Speed Insights - Performance Monitoring
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights({
  framework: 'vanilla',
  debug: false
});

console.log('⚡ Speed Insights: Monitoring enabled');
