import React from "react";

export default class Home extends React.Component {

	ctxDimensions = {
		width: undefined,
		height: undefined
	};

	threshold = 50;
	modifier = 1;
	scale = .25;

	componentDidMount = () => {
		this.rawcanvas = this.refs.rawcanvas;
		this.rawctx = this.rawcanvas.getContext("2d");

		this.canvas = this.refs.canvas;
		this.ctx = this.canvas.getContext("2d");

		this.img = this.refs.image;

		this.img.onload = () => {
			let imageWidth = this.img.width;
			let imageHeight = this.img.height;

			//this.rawcanvas.height = this.rawcanvas.width * (this.img.height / this.img.width);

			this.rawctx.filter = 'grayscale(100%)'
			this.rawctx.filter = 'invert(100%)'
			this.rawctx.drawImage(this.img, 0, 0, this.img.width * this.scale, this.img.height * this.scale);

			this.ctxDimensions.width = this.img.width * this.scale;
			this.ctxDimensions.height = this.img.height * this.scale;

			const pixelData = this.rawctx.getImageData(0, 0, this.ctxDimensions.width, this.ctxDimensions.height);

			this.findEdges(pixelData);
		}
	}

	findEdges = (pixelData) => {

		for (let y = 0; y < this.ctxDimensions.height; y += this.modifier) {
			for (let x = 0; x < this.ctxDimensions.width; x += this.modifier) {
				const { r, g, b } = this.getPixel(pixelData.data, x, y);
				this.ctx.beginPath();
				this.ctx.arc(x, y, 0.5, 0, 2 * Math.PI, false);
				this.ctx.fillStyle = `rgb(${r},${g},${b})`;
				this.ctx.fill();
				this.ctx.beginPath();
			}
		}

		//pixelData = this.rawctx.getImageData(0, 0, this.ctxDimensions.width, this.ctxDimensions.height);

		//const height = pixelData.height;
		//const width = pixelData.width;
		////const height = 300;
		////const width = 300;

		//let left = undefined;
		//let top = undefined;
		//let right = undefined;
		//let bottom = undefined;


		//for (let y = 0; y < height; y += this.modifier) {
		//	for (let x = 0; x < width; x += this.modifier) {
		//		const index = (x + y * this.ctxDimensions.width) * 4;
		//		const pixel = { r: pixelData.data[index], g: pixelData.data[index + 1], b: pixelData.data[index + 2] }

		//		left = { r: pixelData.data[index - 3], g: pixelData.data[index - 2], b: pixelData.data[index - 1] } //pixelData.data.data[index - 4];
		//		right = { r: pixelData.data[index + 3], g: pixelData.data[index + 4], b: pixelData.data[index + 5] } // pixelData.data.data[index + 2];
		//		top = { r: pixelData.data[index - (this.ctxDimensions.width * 4)], g: pixelData.data[index + 1 - (this.ctxDimensions.width * 4)], b: pixelData.data[index + 2 - (this.ctxDimensions.width * 4)] } // pixelData.data.data[index - (this.ctxDimensions.width * 4)];
		//		bottom = { r: pixelData.data[index + (this.ctxDimensions.width * 4)], g: pixelData.data[index + 1 + (this.ctxDimensions.width * 4)], b: pixelData.data[index + 2 + (this.ctxDimensions.width * 4)] } // pixelData.data.data[index + (this.ctxDimensions.width * 4)];

		//		if (this.compare(pixel, left)) {
		//			this.plotPoint(x, y);
		//		}
		//		else if (this.compare(pixel, right)) {
		//			this.plotPoint(x, y);
		//		}
		//		else if (this.compare(pixel, top)) {
		//			this.plotPoint(x, y);
		//		}
		//		else if (this.compare(pixel, bottom)) {
		//			this.plotPoint(x, y);
		//		}
		//	}
		//}
	}

	getPixel = (data, x, y) => {
		const index = (x + y * this.ctxDimensions.width) * 4;
		const r = data[index]
		const g = data[index + 1]
		const b = data[index + 2]

		const min = 100;

		if (r < min && g < min && b < min) return { r: 0, g: 0, b: 0 }
		return { r: 255, g: 255, b: 255 }

		//const pixel = { r, g, b };
		//return { r: data[index], g: data[index + 1], b: data[index + 2] }
	}

	compare = (pixel, neighbor) => {
		if (pixel.r > neighbor.r + this.threshold || pixel.g > neighbor.g + this.threshold || pixel.b > neighbor.b + this.threshold) {
			return true;
		}
		else if (pixel.r < neighbor.r - this.threshold || pixel.g < neighbor.g - this.threshold || pixel.b < neighbor.b - this.threshold) {
			return true;
		}
	}

	plotPoint = (x, y) => {
		this.ctx.beginPath();
		this.ctx.arc(x, y, 0.5, 0, 2 * Math.PI, false);
		this.ctx.fillStyle = 'green';
		this.ctx.fill();
		this.ctx.beginPath();

		this.rawctx.beginPath();
		this.rawctx.arc(x, y, 0.5, 0, 2 * Math.PI, false);
		this.rawctx.fillStyle = 'green';
		this.rawctx.fill();
		this.rawctx.beginPath();
	}

	render = () => {
		return (
			<div>
				<canvas ref="rawcanvas" width={800} height={800} className=""/>
				<canvas ref="canvas" width={800} height={800} />
				<img alt="puzzle piece" ref="image" src="./puzzlePieces2.jpg" className="hidden" />
			</div>
		);
	}
}
