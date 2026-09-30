// Statically parsed JSON configuration
exports.description = "The Takeback theme from the classic HFS2"
exports.version = 1
exports.apiRequired = 13.4 // Standard API level for HFS3 plugins
exports.isTheme = true      // Tells HFS3 to disable other active themes when loaded

// Include the custom CSS file from the public directory
exports.frontend_css = [
    'takeback-general.css',
    'takeback-filelist.css',
	'font.css'
]
exports.frontend_js = [
    'main.js',
    'takeback-general-main.js',
	'takeback-filelist-main.js'
]

// Disables default frontend styles so Takeback styles apply cleanly
exports.disableDefaultStyle = false 

exports.init = function(api) {
  // Add initialization logic or backend hooks if needed
  return {
    unload() {
      // Clean up background tasks or listeners
    }
  }
}