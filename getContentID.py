import hashlib
from hachoir.parser import createParser
from hachoir.metadata import extractMetadata

# Chemin vers la vidéo
video_path = 'video.mp4'

# Créer un analyseur de fichier
parser = createParser(video_path)

# Extraire les métadonnées
metadata = extractMetadata(parser)

# Extraire les informations pertinentes des métadonnées
metadata_string = ""
for line in metadata.exportPlaintext():
    metadata_string += line.strip() + "\n"

content_id = hashlib.sha256(metadata_string.encode()).hexdigest()
print("Content ID généré:", content_id)
