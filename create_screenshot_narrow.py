
import os
from PIL import Image, ImageDraw, ImageFont

# Define paths relative to the project root
screenshots_dir = 'public/screenshots'
image_path = os.path.join(screenshots_dir, 'screenshot-narrow.png')

# Create the directory if it doesn't exist
os.makedirs(screenshots_dir, exist_ok=True)

# Image properties
width, height = 720, 1280
background_color = (245, 245, 220)  # Beige
text_color = (143, 188, 143)      # Dark Sea Green
text = "LinguaLecta"

# Create a new image
image = Image.new('RGB', (width, height), color=background_color)
draw = ImageDraw.Draw(image)

# Font handling (try to load a common font, fall back to default)
try:
    font = ImageFont.truetype("arial.ttf", 60)
except IOError:
    try:
        font = ImageFont.load_default(size=50)
    except AttributeError:
        font = ImageFont.load_default()

# Calculate text position
bbox = draw.textbbox((0, 0), text, font=font)
textwidth = bbox[2] - bbox[0]
textheight = bbox[3] - bbox[1]

x = (width - textwidth) / 2
y = (height - textheight) / 2

# Draw the text onto the image
draw.text((x, y), text, font=font, fill=text_color)

# Save the image
image.save(image_path)

print(f"Successfully created screenshot at {image_path}")
