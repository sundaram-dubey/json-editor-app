#!/bin/bash

# Path to the SVG file
SVG_FILE="build/icons/icon.svg"

# Create the PNG directory if it doesn't exist
mkdir -p build/icons

# Check if ImageMagick's convert is installed
if ! command -v convert &> /dev/null
then
    echo "ImageMagick not found, installing..."
    # macOS (using Homebrew)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    # Linux (Debian-based)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y imagemagick
    else
        echo "Unsupported OS for automatic installation. Please install ImageMagick manually."
        exit 1
    fi
fi

# Check if the SVG file exists
if [ ! -f "$SVG_FILE" ]; then
    echo "SVG file not found at $SVG_FILE"
    exit 1
fi

# Convert SVG to various PNG sizes
echo "Converting SVG to PNGs..."
convert -background none -size 16x16 "$SVG_FILE" build/icons/16x16.png
convert -background none -size 32x32 "$SVG_FILE" build/icons/32x32.png
convert -background none -size 64x64 "$SVG_FILE" build/icons/64x64.png
convert -background none -size 128x128 "$SVG_FILE" build/icons/128x128.png
convert -background none -size 256x256 "$SVG_FILE" build/icons/256x256.png
convert -background none -size 512x512 "$SVG_FILE" build/icons/512x512.png
convert -background none -size 1024x1024 "$SVG_FILE" build/icons/icon.png

# Create macOS icns file
echo "Creating macOS .icns file..."
mkdir -p build/icons/mac.iconset
cp build/icons/16x16.png build/icons/mac.iconset/icon_16x16.png
cp build/icons/32x32.png build/icons/mac.iconset/icon_16x16@2x.png
cp build/icons/32x32.png build/icons/mac.iconset/icon_32x32.png
cp build/icons/64x64.png build/icons/mac.iconset/icon_32x32@2x.png
cp build/icons/128x128.png build/icons/mac.iconset/icon_128x128.png
cp build/icons/256x256.png build/icons/mac.iconset/icon_128x128@2x.png
cp build/icons/256x256.png build/icons/mac.iconset/icon_256x256.png
cp build/icons/512x512.png build/icons/mac.iconset/icon_256x256@2x.png
cp build/icons/512x512.png build/icons/mac.iconset/icon_512x512.png
cp build/icons/1024x1024.png build/icons/mac.iconset/icon_512x512@2x.png

# Create the icns file using iconutil (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    iconutil -c icns build/icons/mac.iconset -o build/icons/icon.icns
    echo "macOS .icns file created successfully"
else
    echo "Skipping .icns creation as this is not macOS"
fi

echo "All icons have been generated successfully!" 