curl -X POST \
  https://xrbhog4g8g.execute-api.eu-west-2.amazonaws.com/prod/prb0t \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -d '{
  "user": "tonylukasavage",
  "repo": "cv2r",
  "description": "test description",
  "title": "test title",
  "commit": "test commit",
  "files": [
  	{"path": "patch/simon/simon/index.json", "content": "index.json"},
    {"path": "patch/simon/simon/simon.png", "content": "image content"}
  ]
}'