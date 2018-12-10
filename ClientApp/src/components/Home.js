import React from "react";

export default class Home extends React.Component {

	ctxDimensions = {
		width: undefined,
		height: undefined
	};

	colorThreshold = 50;
	modifier = 1;
	scale = .25;
	edgeThreshold = 3;
	noiseThreshold = 1;

	piecePixels = {
		xColumns: {},
		yRows: {}
	}
	emptyPixels = []

	constructor(props) {
		super(props) 

		this.state = {
			pieces: {},
			showXEdges: true,
			showYEdges: true
		}

		this.drawEdges = this.drawEdges.bind(this)
		this.toggleXEdges = this.toggleXEdges.bind(this) 
		this.toggleYEdges = this.toggleYEdges.bind(this) 
	}

	componentDidMount = () => {
		this.rawcanvas = this.refs.rawcanvas;
		this.rawctx = this.rawcanvas.getContext("2d");

		this.canvas = this.refs.canvas;
		this.ctx = this.canvas.getContext("2d");

		this.img = this.refs.image;

		this.img.onload = () => {
			let imageWidth = this.img.width;
			let imageHeight = this.img.height;

			this.rawcanvas.height = this.rawcanvas.width * (this.img.height / this.img.width);
			this.canvas.height = this.rawcanvas.height

			this.rawctx.filter = 'grayscale(100%)'
			this.rawctx.filter = 'invert(100%)'
			this.rawctx.drawImage(this.img, 0, 0, this.img.width * this.scale, this.img.height * this.scale);
			// this.rawctx.filter = 'grayscale(0)'
			// this.rawctx.filter = 'invert(0)'

			this.ctxDimensions.width = this.img.width * this.scale;
			this.ctxDimensions.height = this.img.height * this.scale;

			const pixelData = this.rawctx.getImageData(0, 0, this.ctxDimensions.width, this.ctxDimensions.height);

			this.findEdges(pixelData);
		}
	}

	async findEdges(pixelData) {
		let pieces = await this.getPieces(pixelData);
		pieces = await this.getEdges(pieces);
		this.setState({pieces});
	}


	drawEdges() {
		const { pieces, showXEdges, showYEdges } = this.state;
		const { piecePixels } = pieces;
		if (!piecePixels) return;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		Object.keys(piecePixels)
			.filter(i => !!piecePixels[i].xEdge || !!piecePixels[i].yEdge)
			.map( i => {
				const piecePixel = piecePixels[i]

				if (showXEdges && !!piecePixel.xEdge) {
					this.ctx.fillStyle = 'red'
					this.ctx.beginPath();
					this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
					this.ctx.fill();
					this.ctx.beginPath();
				}
				else if (showYEdges && !!piecePixel.yEdge) {
					this.ctx.fillStyle = 'green'
					this.ctx.beginPath();
					this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
					this.ctx.fill();
					this.ctx.beginPath();
				}
				else {
					// this.ctx.fillStyle = 'blue'
					// this.ctx.beginPath();
					// this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
					// this.ctx.fill();
					// this.ctx.beginPath();
				}
			}
		)
	}

	toggleXEdges() {
		this.setState({ showXEdges: !this.state.showXEdges })
	}

	toggleYEdges() {
		this.setState({ showYEdges: !this.state.showYEdges })
	}

	getPieces = (pixelData) => {
		const xStart = 0
		const width = this.ctxDimensions.width;
		// const xStart = 100
		// const width = 400; 
		const yStart = 0
		const height = this.ctxDimensions.height;
		// const yStart = 100
		// const height = 400; 
		
		let result = { piecePixels: {}, xColumns: {}, yRows: {}};

		for (let y = yStart; y < height; y += this.modifier) {
			for (let x = xStart; x < width; x += this.modifier) {
				let pixel = this.getPixel(pixelData.data, x, y);
				if (pixel.isPiece) {
					result.piecePixels[`${x}-${y}`] = {x,y,pixel}

					if (!result.xColumns[x]) result.xColumns[x] = []
					result.xColumns[x].push({x, y}); 

					if (!result.yRows[y]) result.yRows[y] = []
					result.yRows[y].push({x, y});
				} else {
					this.emptyPixels.push({x,y,pixel})
				}
			}
		}

		return result;
	}

	getEdges = async ({ piecePixels, xColumns, yRows }) => {
		let xEdges = {}
		let yEdges = {}

		// First, just do a rough comparison to find pixels with a neighbor
		await Object.keys(xColumns).map( key => {
			const xCoords = xColumns[key]
			xCoords.map( xCoord => {
				const top = xCoords.filter(neighbor => neighbor.y > xCoord.y && neighbor.y <= xCoord.y + this.modifier * this.edgeThreshold) //xColumns[`${xCoord.x}-${xCoord.y+1}`]
				const bottom = xCoords.filter(neighbor => neighbor.y < xCoord.y && neighbor.y >= xCoord.y - this.modifier * this.edgeThreshold)
				const yCoords = yRows[xCoord.y]
				const left = yCoords.filter(neighbor => neighbor.x < xCoord.x && neighbor.x >= xCoord.x - this.modifier * this.edgeThreshold)
				const right = yCoords.filter(neighbor => neighbor.x > xCoord.x && neighbor.x <= xCoord.x + this.modifier * this.edgeThreshold)

				if (top.length > 0 && bottom.length === 0 || top.length === 0 && bottom.length > 0) {
					if (!xEdges[key]) xEdges[key] = []
					xEdges[key].push(xCoord)
				}
				if (left.length > 0 && right.length === 0 || left.length === 0 && right.length > 0) {
					if (!yEdges[key]) yEdges[key] = []
					yEdges[key].push(xCoord)
				}
			})
		})

		// Then remove the noise by doing another filter
		// await this.removeXNoise(xEdges, yEdges)
		// await this.removeYNoise(xEdges, yEdges)

		Object.keys(xEdges).map( key => {
			xEdges[key].map( edge => {
				piecePixels[`${edge.x}-${edge.y}`].xEdge = true
			})
		})

		// console.log(piecePixels);
		Object.keys(yEdges).map( key => {
			yEdges[key].map( edge => {
				piecePixels[`${edge.x}-${edge.y}`].yEdge = true
			})
		})
		return { piecePixels, xColumns, yRows, xEdges, yEdges }; 
	}

	removeXNoise = async (xEdges, yEdges) => {
		Object.keys(xEdges).map( key => {
			const coords = xEdges[key]
			coords.map( coord => {
				// const top = coords.filter(neighbor => neighbor.y > coord.y && neighbor.y <= coord.y + this.modifier * this.noiseThreshold) //xColumns[`${coordx}-${coord.y+1}`]
				// const bottom = coords.filter(neighbor => neighbor.y < coord.y && neighbor.y >= coord.y - this.modifier * this.noiseThreshold)
				const yCoords = yEdges[coord.y]
				if (!yCoords) return coord
				const left = yCoords.filter(neighbor => neighbor.x < coord.x && neighbor.x >= coord.x - this.modifier * this.noiseThreshold)
				const right = yCoords.filter(neighbor => neighbor.x > coord.x && neighbor.x <= coord.x + this.modifier * this.noiseThreshold)
				return { ...coord, xEdge: (left.length > this.noiseThreshold && right.length === this.noiseThreshold || left.length === this.noiseThreshold && right.length > this.noiseThreshold) }
			})
		})
	}

	removeYNoise = async (xEdges, yEdges) => {
		Object.keys(yEdges).map( key => {
			const coords = yEdges[key]
			coords.map( coord => {
				const xCoords = xEdges[coord.x]
				if (!xCoords) return coord
				const top = xCoords.filter(neighbor => neighbor.y > coord.y && neighbor.y <= coord.y + this.modifier * this.noiseThreshold) //xColumns[`${coordx}-${coord.y+1}`]
				const bottom = xCoords.filter(neighbor => neighbor.y < coord.y && neighbor.y >= coord.y - this.modifier * this.noiseThreshold)
				// const left = coords.filter(neighbor => neighbor.x < coord.x && neighbor.x >= coord.x - this.modifier * this.noiseThreshold)
				// const right = coords.filter(neighbor => neighbor.x > coord.x && neighbor.x <= coord.x + this.modifier * this.noiseThreshold)
				return { ...coord, yEdge: (top.length > this.noiseThreshold && bottom.length === this.noiseThreshold || top.length === this.noiseThreshold && bottom.length > this.noiseThreshold) }
			})
		})
	}

	getPixel = (data, x, y) => {
		const index = (x + y * this.ctxDimensions.width) * 4;
		const r = data[index]
		const g = data[index + 1]
		const b = data[index + 2]

		const min = 100;

		if (r < min && g < min && b < min) {
			return { r, g, b, isPiece: true}
		};
		return { r, g, b, isPiece: false}

		//const pixel = { r, g, b };
		//return { r: data[index], g: data[index + 1], b: data[index + 2] }
	}

	compare = (pixel, neighbor) => {
		if (pixel.r > neighbor.r + this.colorThreshold || pixel.g > neighbor.g + this.colorThreshold || pixel.b > neighbor.b + this.colorThreshold) {
			return true;
		}
		else if (pixel.r < neighbor.r - this.colorThreshold || pixel.g < neighbor.g - this.colorThreshold || pixel.b < neighbor.b - this.colorThreshold) {
			return true;
		}
	}

	render() {
		const { pieces, showXEdges, showYEdges } = this.state;

		console.log(pieces);
		if (!!pieces) {
			this.drawEdges()
		}
		return (
			<div style={{display: 'flex'}}>
				<div>
					<canvas ref="rawcanvas" width={800} height={800} className=""/>
					<canvas ref="canvas" width={800} height={800} />
					{/* <img alt="puzzle piece" ref="image" src="./puzzlePieces.jpg" className="" /> */}
					<img alt="puzzle piece" ref="image" src="./puzzlePieces2.jpg" className="" />
				</div>
				<div>
					<div>
						<button onClick={this.toggleXEdges}>{showXEdges ? 'Hide' : 'Show'} X Edges</button> {!!pieces && !!pieces.xEdges && Object.keys(pieces.xEdges).length > 0 && Object.keys(pieces.xEdges).length}
					</div>
					<div>
						<button onClick={this.toggleYEdges}>{showYEdges ? 'Hide' : 'Show'} Y Edges</button> {!!pieces && !!pieces.yEdges && Object.keys(pieces.yEdges).length > 0 && Object.keys(pieces.yEdges).length}
					</div>
				</div>
			</div>
		);
	}
}
