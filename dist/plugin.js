exports.repo = "SteliosLL/Takeback-reborn-hfs-theme"
exports.description = "The Takeback theme from the classic HFS2[UNDER DEVELOPMENT]"
exports.version = 1
exports.apiRequired = 9.6
exports.isTheme = true 

exports.frontend_css = [
    'takeback-general.css',
    'takeback-filelist.css',
	  'font.css',
  'prism.css'
]
exports.frontend_js = [
    'main.js',
    'takeback-general-main.js',
    'artplayer.js',
	  'multimedia.js',
  'prism.js'
]

// Disable default frontend styles so Takeback styles apply cleanly
exports.disableDefaultStyle = false 

/* FOR REFERENCE
exports.config = {
    limitMB: {frontend: true, type: 'number', label: 'Limit MB', helperText: 'Disable edit on files greater than this limit', defaultValue: 1, min: 0},
}
*/

exports.init = function(api) {
  // Add initialization logic or backend hooks if needed
  return {
    unload() {

    }
  }
}