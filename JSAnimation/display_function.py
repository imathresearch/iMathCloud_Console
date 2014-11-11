from IPython.display import HTML

VIDEO_TAG = \
"""
<video width="640" height="480" controls>  
  <source src="rest/pathtohandler/{0} type="video/mp4">
Your browser does not support the video tag, check out the YouTuve version instead: http://youtu.be/Nj3_npq7MZI.
</video>
"""

def display_video(videoPath):
	VIDEO_TAG.format(videoPath);
	return HTML(VIDEO_TAG)
