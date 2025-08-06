export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Add cssnano for production builds to minify CSS
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: false,
        }]
      }
    })
  },
}