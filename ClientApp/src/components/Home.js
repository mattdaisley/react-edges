import React from "react";
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { actionCreators, selectors } from '../store/PieceClassifier/reducer';

class Home extends React.Component {

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
		let pieces = await selectors.getPieces(this.props, pixelData, this.ctxDimensions);
		// pieces = await selectors.getEdges(this.props, pieces);
		console.log(pieces, pieces.piecePixels[`0-0`]);
		this.setState({pieces});
	}


	async drawEdges() {
		const { piecePixels, pieceSet } = this.state.pieces;
		if (!piecePixels || !pieceSet) return;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		await this.drawPieceSets();
		// await this.drawPiecePixels();
	}

	drawPiecePixels() {
		const { pieces, showXEdges, showYEdges } = this.state;
		const { piecePixels } = pieces;

		const edgePixels = Object.keys(piecePixels).filter(i => !!piecePixels[i].xEdge || !!piecePixels[i].yEdge);
		console.log(edgePixels)
		
		edgePixels.map( i => {
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
					this.ctx.fillStyle = 'blue'
					this.ctx.beginPath();
					this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
					this.ctx.fill();
					this.ctx.beginPath();
				}
			}
		)
	}

	drawPieceSets() {
		const { pieces } = this.state;
		const { piecePixels, pieceSet } = pieces;

		Object.keys(pieceSet).map( pieceKey => {
			const piece = pieceSet[pieceKey];
			const pixels = Object.keys(piece.pixels)
	
			this.ctx.fillStyle = "#"+((1<<24)*Math.random()|0).toString(16)
			pixels.map( i => {
					const piecePixel = piece.pixels[i]
	
					this.ctx.beginPath();
					this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
					this.ctx.fill();
					this.ctx.beginPath();
				}
			)

			this.ctx.strokeStyle="red";
			this.ctx.rect(piece.minX, piece.minY, piece.maxX - piece.minX, piece.maxY - piece.minY);
			this.ctx.stroke();
		})
	}

	toggleXEdges() {
		this.setState({ showXEdges: !this.state.showXEdges })
	}

	toggleYEdges() {
		this.setState({ showYEdges: !this.state.showYEdges })
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
		const { pieceSet } = pieces

		if (!!pieces) {
			this.drawEdges()
		}
		return (
			<div style={{display: 'flex'}}>
				<div>
					<canvas ref="rawcanvas" width={800} height={800} className="hidden"/>
					<canvas ref="canvas" width={800} height={800} />
					{/* <img alt="puzzle piece" ref="image" src="./puzzlePieces.jpg" className="" /> */}
					<img alt="puzzle piece" ref="image" src="./puzzlePieces2.jpg" className="hidden" />
				</div>
				<div>
					<div>
						<button onClick={this.toggleXEdges}>{showXEdges ? 'Hide' : 'Show'} X Edges</button> {!!pieces && !!pieces.xEdges && Object.keys(pieces.xEdges).length > 0 && Object.keys(pieces.xEdges).length}
					</div>
					<div>
						<button onClick={this.toggleYEdges}>{showYEdges ? 'Hide' : 'Show'} Y Edges</button> {!!pieces && !!pieces.yEdges && Object.keys(pieces.yEdges).length > 0 && Object.keys(pieces.yEdges).length}
					</div>
					<div>
						{
							!!pieceSet && Object.keys(pieceSet).map( pieceKey => {
								const piece = pieceSet[pieceKey];
								return (<div key={pieceKey}>{pieceKey} - X Min: {piece.minX}, X Max: {piece.maxX}, Y Min: {piece.minY}, Y Max: {piece.maxY}, Pixel Count: {Object.keys(piece.pixels).length}</div>)
							})
						}
					</div>
				</div>
			</div>
		);
	}
}
export default connect(
  state => state.PieceClassifier,
  dispatch => bindActionCreators(actionCreators, dispatch)
)(Home);

