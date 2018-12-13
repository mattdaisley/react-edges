const requestWeatherForecastsType = 'REQUEST_WEATHER_FORECASTS';
const receiveWeatherForecastsType = 'RECEIVE_WEATHER_FORECASTS';
const initialState = {
  ctxDimensions: {
		width: undefined,
		height: undefined
	},
	colorThreshold: 50,
  modifier: 1,
  pieceSetSearchModifier: 10,
	scale: .25,
	edgeThreshold: 3,
	noiseThreshold: 1,

	piecePixels: {
		xColumns: {},
		yRows: {}
  },
  pieceSet: {},

	emptyPixels: []
};

export const selectors = {
  getPieces: async (state, pixelData, ctxDimensions) => {
		const xStart = 0
		const width = ctxDimensions.width;
		const yStart = 0
    const height = ctxDimensions.height;

		// const yStart = 100
		// const height = 400
		// const xStart = 100
		// const width = 400

    let result = { piecePixels: {}, xColumns: {}, yRows: {}, pieceSet: {}};
    let pieceIndex = 0;
    result.pieceSet[pieceIndex] = { pixels: {}, minX: undefined, minY: undefined, maxX: undefined, maxY: undefined}

    // loop through the pixel data to find any pieces
		for (let y = yStart; y < height; y += state.pieceSetSearchModifier) {
			for (let x = xStart; x < width; x += state.pieceSetSearchModifier) {

        if (!result.pieceSet[pieceIndex])
          result.pieceSet[pieceIndex] = { pixels: {}, minX: undefined, minY: undefined, maxX: undefined, maxY: undefined}

        const key = `${x}-${y}`;
        const fillResult = await floodFill(pixelData.data, key, x, y, ctxDimensions.width, state.modifier, result.pieceSet[pieceIndex], result.piecePixels)

        if (fillResult.newPieceFound && Object.keys(fillResult.pieceSet.pixels).length > 20) {
          result.pieceSet[pieceIndex] = fillResult.pieceSet;
          pieceIndex++
        }
        result.piecePixels = fillResult.piecePixels;

        // let pixel = getPixel(pixelData.data, x, y, ctxDimensions.width);
        // console.log(result.piecePixels[key], result, fillResult)
				if (!!result.piecePixels[key] && result.piecePixels[key].isPiece) {
					if (!result.xColumns[x]) result.xColumns[x] = []
					result.xColumns[x].push({x, y});

					if (!result.yRows[y]) result.yRows[y] = []
					result.yRows[y].push({x, y});
				}
			}
		}

		return result;
  },

  getEdges: async (state, pieces) => {
    const { pieceSetSearchModifier } = state;
    const { pieceSet, piecePixels } = pieces;

    let edgesResult = {};

    // console.log(pieceSet, piecePixels);

    await Object.keys(pieceSet).forEach( pieceKey => {
      const piece = pieceSet[pieceKey]

      if (Object.keys(piece.pixels).length < 1) return

      // let firstPixelKey = Object.keys(piece.pixels)[0];
      // let firstPixel = piece.pixels[firstPixelKey]

      Object.keys(piece.pixels).forEach( pixelKey => {
        const pixel = piece.pixels[pixelKey]
        const isEdge = checkCorner(pixel, piece.pixels, state.modifier);
        if (isEdge) {
          edgesResult[`${pixel.x}-${pixel.y}`] = pixel;
        }
      })
    })

    return edgesResult;
  },

	getEdgesOld: async (state, pieces) => {
    const { piecePixels, xColumns, yRows } = pieces;

		let xEdges = {}
		let yEdges = {}
		// First, just do a rough comparison to find pixels with a neighbor
		await Object.keys(xColumns).forEach( key => {
			const xCoords = xColumns[key]
			xCoords.forEach( xCoord => {
				const top = xCoords.filter(neighbor => neighbor.y > xCoord.y && neighbor.y <= xCoord.y + state.modifier * state.edgeThreshold) //xColumns[`${xCoord.x}-${xCoord.y+1}`]
				const bottom = xCoords.filter(neighbor => neighbor.y < xCoord.y && neighbor.y >= xCoord.y - state.modifier * state.edgeThreshold)
				const yCoords = yRows[xCoord.y]
				const left = yCoords.filter(neighbor => neighbor.x < xCoord.x && neighbor.x >= xCoord.x - state.modifier * state.edgeThreshold)
				const right = yCoords.filter(neighbor => neighbor.x > xCoord.x && neighbor.x <= xCoord.x + state.modifier * state.edgeThreshold)

				if ((top.length > 0 && bottom.length === 0) || (top.length === 0 && bottom.length > 0)) {
					if (!xEdges[key]) xEdges[key] = []
					xEdges[key].push(xCoord)
				}
				if ((left.length > 0 && right.length === 0) || (left.length === 0 && right.length > 0)) {
					if (!yEdges[key]) yEdges[key] = []
					yEdges[key].push(xCoord)
				}
			})
		})

		// Then remove the noise by doing another filter
		// await this.removeXNoise(xEdges, yEdges)
		// await this.removeYNoise(xEdges, yEdges)

		Object.keys(xEdges).forEach( key => {
			xEdges[key].forEach( edge => {
				piecePixels[`${edge.x}-${edge.y}`].xEdge = true
			})
		})

		// console.log(piecePixels);
		Object.keys(yEdges).forEach( key => {
			yEdges[key].forEach( edge => {
				piecePixels[`${edge.x}-${edge.y}`].yEdge = true
			})
		})
		return { ...pieces, piecePixels, xColumns, yRows, xEdges, yEdges };
	}
}

const checkCorner = (pixel, pixels, modifier) => {
  const { x, y } = pixel;
  //console.log(pixel)

  let totalAround = 0;

  totalAround += pixels[`${x+modifier}-${y}`] ? 1 : 0
  totalAround += pixels[`${x-modifier}-${y}`] ? 1 : 0
  totalAround += pixels[`${x}-${y+modifier}`] ? 1 : 0
  totalAround += pixels[`${x}-${y-modifier}`] ? 1 : 0
  totalAround += pixels[`${x+modifier}-${y+modifier}`] ? 1 : 0
  totalAround += pixels[`${x+modifier}-${y-modifier}`] ? 1 : 0
  totalAround += pixels[`${x-modifier}-${y+modifier}`] ? 1 : 0
  totalAround += pixels[`${x-modifier}-${y-modifier}`] ? 1 : 0

  if (totalAround <= 4) {
    return true
  }
}

const floodFill = (data, key, startX, startY, width, modifier, pieceSet, piecePixels) => {
  // If piecePixels already has a value for this pixel, just return the set
  if (!!piecePixels[key]) {
    return { pieceSet, piecePixels, newPieceFound: false};
  }

  // If the pixel is not a piece, add it to piecePixels and return
  const pixel = getPixel(data, startX, startY, width)
  if (!pixel.isPiece) {
    piecePixels[key] = pixel;
    return { pieceSet, piecePixels, newPieceFound: false};
  }

  // Setup the queue to start at the designered points
  let queue = nextPixels(startX, startY, modifier)
  while ( queue.length > 0 ) {
    const { x, y } = queue[0];
    const pixelKey = `${x}-${y}`;

    if (!piecePixels[pixelKey]){
      const pixel = getPixel(data, x, y, width)
      if (pixel.isPiece) {
        // If it's a piece, find any neighbors to recursively process
        queue.push(...nextPixels(x, y, modifier))

        pieceSet.pixels[pixelKey] = pixel;

        pieceSet.minX = (!!pieceSet.minX && x > pieceSet.minX) ? pieceSet.minX : x;
        pieceSet.maxX = (!!pieceSet.maxX && x < pieceSet.maxX) ? pieceSet.maxX : x;
        pieceSet.minY = (!!pieceSet.minY && y > pieceSet.minY) ? pieceSet.minY : y;
        pieceSet.maxY = (!!pieceSet.maxY && y < pieceSet.maxY) ? pieceSet.maxY : y;
      }
      piecePixels[pixelKey] = pixel;
    }

    // remove this item from the queue so we don't keep processing it
    queue.shift()
  }

  if (!piecePixels[key]) console.log(key, pieceSet)
  return { pieceSet, piecePixels, newPieceFound: true};
}

const nextPixels = (x, y, modifier) => { return [{x: x+modifier, y}, {x: x-modifier, y}, {x, y: y+modifier}, {x, y: y-modifier}] }

const getPixel = (data, x, y, width) => {
  const index = (x + y * width) * 4;
  const r = data[index]
  const g = data[index + 1]
  const b = data[index + 2]

  const min = 100;

  if (r < min && g < min && b < min) {
    return { isPiece: true, r, g, b, x, y}
  };
  return { isPiece: false, r, g, b, x, y}
}

export const actionCreators = {
  requestWeatherForecasts: startDateIndex => async (dispatch, getState) => {
    if (startDateIndex === getState().weatherForecasts.startDateIndex) {
      // Don't issue a duplicate request (we already have or are loading the requested data)
      return;
    }

    dispatch({ type: requestWeatherForecastsType, startDateIndex });

    const url = `api/SampleData/WeatherForecasts?startDateIndex=${startDateIndex}`;
    const response = await fetch(url);
    const forecasts = await response.json();

    dispatch({ type: receiveWeatherForecastsType, startDateIndex, forecasts });
  }
};

export const reducer = (state, action) => {
  state = state || initialState;

  if (action.type === requestWeatherForecastsType) {
    return {
      ...state,
      startDateIndex: action.startDateIndex,
      isLoading: true
    };
  }

  if (action.type === receiveWeatherForecastsType) {
    return {
      ...state,
      startDateIndex: action.startDateIndex,
      forecasts: action.forecasts,
      isLoading: false
    };
  }

  return state;
};
