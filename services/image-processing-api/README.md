
# Image Processing API

## A brief description of what this project does

In his project i have built an API that can be used in two different ways.
As a simple placeholder API, the first allows you to place images
into your frontend with the size set via URL parameters (and additional stylization if you choose) for rapid prototyping. 
The second use case is as a library to serve properly scaled versions of your images to the front end to reduce page load size.
Rather than needing to resize and upload multiple copies of the same image to be used throughout your site,
the API you create will handle resizing and serving stored images for you. 



## API Reference

#### Resize an image

```http
  GET /api/images
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `filename` | `string` | **Required**. Image name to resize |
| `height` | `number` | **Required**. Image height |
| `width` | `number` | **Required**. Image width |




## Run Locally

Clone the project

```bash
  git clone https://github.com/abdulrahman9901/Image-Processing-API.git
```

Go to the project directory

```bash
  cd Image-Processing-API
```

Install dependencies

```bash
  npm install
```

build the project

```bash
  npm run build
```

Start the server on development mode

```bash
  npm run start-dev
```

Start the server on production mode

```bash
  npm run start-prod
```

## Running Tests

To run tests, run the following command

```bash
  npm run test
```


## Usage/Examples

At this moment the project will be running at ypur local server 3000
unless you changed it so to use it you need to provide a name for jpg
image that must be in assets/full folder also provide height and width 
that are larger than 0
 
```http
http://localhost:3000/api/images?filename=icelandwaterfall&height=100&width=300

```

