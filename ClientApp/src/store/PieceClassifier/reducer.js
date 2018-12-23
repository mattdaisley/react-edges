const requestWeatherForecastsType = "REQUEST_WEATHER_FORECASTS";
const receiveWeatherForecastsType = "RECEIVE_WEATHER_FORECASTS";
const initialState = {
  ctxDimensions: {
    width: undefined,
    height: undefined
  },
  colorThreshold: 50,
  modifier: 1,
  apperature: 2,
  cornerThreshold: 0.45,
  pieceSetSearchModifier: 10,
  scale: 0.25,
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
    const xStart = 0;
    const width = ctxDimensions.width;
    const yStart = 0;
    const height = ctxDimensions.height;

    // const yStart = 100
    // const height = 400
    // const xStart = 100
    // const width = 400

    let result = { piecePixels: {}, xColumns: {}, yRows: {}, pieceSet: {} };
    let pieceIndex = 0;
    result.pieceSet[pieceIndex] = {
      pixels: {},
      minX: undefined,
      minY: undefined,
      maxX: undefined,
      maxY: undefined
    };

    // loop through the pixel data to find any pieces
    for (let y = yStart; y < height; y += state.pieceSetSearchModifier) {
      for (let x = xStart; x < width; x += state.pieceSetSearchModifier) {
        if (!result.pieceSet[pieceIndex])
          result.pieceSet[pieceIndex] = {
            pixels: {},
            minX: undefined,
            minY: undefined,
            maxX: undefined,
            maxY: undefined
          };

        const key = `${x}-${y}`;
        const fillResult = await floodFill(
          pixelData.data,
          key,
          x,
          y,
          ctxDimensions.width,
          state.modifier,
          result.pieceSet[pieceIndex],
          result.piecePixels
        );

        if (
          fillResult.newPieceFound &&
          Object.keys(fillResult.pieceSet.pixels).length > 20
        ) {
          result.pieceSet[pieceIndex] = fillResult.pieceSet;
          pieceIndex++;
        }
        result.piecePixels = fillResult.piecePixels;

        // let pixel = getPixel(pixelData.data, x, y, ctxDimensions.width);
        // console.log(result.piecePixels[key], result, fillResult)
        if (!!result.piecePixels[key] && result.piecePixels[key].isPiece) {
          if (!result.xColumns[x]) result.xColumns[x] = [];
          result.xColumns[x].push({ x, y });

          if (!result.yRows[y]) result.yRows[y] = [];
          result.yRows[y].push({ x, y });
        }
      }
    }

    return result;
  },

  getEdges: async (state, pieces) => {
    const { modifier, apperature, cornerThreshold } = state;
    const { pieceSet } = pieces;

    let result = {};

    await Object.keys(pieceSet).forEach(async pieceKey => {
      const piece = pieceSet[pieceKey];

      if (Object.keys(piece.pixels).length < 1) return;

      result[pieceKey] = { corners: {}, edges: [], angles: [] };

      await Object.keys(piece.pixels).forEach(pixelKey => {
        const pixel = piece.pixels[pixelKey];
        const isEdge = checkCorner(
          pixel,
          piece.pixels,
          modifier,
          apperature,
          cornerThreshold
        );
        if (isEdge) {
          result[pieceKey].corners[`${pixel.x}-${pixel.y}`] = pixel;
        }
      });

      let sourceCorners = [...Object.keys(result[pieceKey].corners)];
      while (sourceCorners.length > 1) {
        const p1Key = sourceCorners[0];
        for (let i = 1; i < sourceCorners.length; i++) {
          const p2Key = sourceCorners[i];

          const p1 = result[pieceKey].corners[p1Key];
          const p2 = result[pieceKey].corners[p2Key];

          var p1p2Distance = Math.sqrt(
            Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
          );

          //let twoPointAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

          if (p1p2Distance > 50) {
            // console.log(`p1:${p1.x},${p1.y} - p2:${p2.x},${p2.y} - p3:${p3.x},${p3.y} -- p1-p2 distance: ${p1p2Distance}`)
            result[pieceKey].edges.push({ length: p1p2Distance, p1, p2 });
          }
        }
        sourceCorners.shift();
      }

      const angles = await checkFor90(result[pieceKey].corners);
      result[pieceKey].angles = angles;
    });

    return result;
  },

  getEdgesOld: async (state, pieces) => {
    const { piecePixels, xColumns, yRows } = pieces;

    let xEdges = {};
    let yEdges = {};
    // First, just do a rough comparison to find pixels with a neighbor
    await Object.keys(xColumns).forEach(key => {
      const xCoords = xColumns[key];
      xCoords.forEach(xCoord => {
        const top = xCoords.filter(
          neighbor =>
            neighbor.y > xCoord.y &&
            neighbor.y <= xCoord.y + state.modifier * state.edgeThreshold
        ); //xColumns[`${xCoord.x}-${xCoord.y+1}`]
        const bottom = xCoords.filter(
          neighbor =>
            neighbor.y < xCoord.y &&
            neighbor.y >= xCoord.y - state.modifier * state.edgeThreshold
        );
        const yCoords = yRows[xCoord.y];
        const left = yCoords.filter(
          neighbor =>
            neighbor.x < xCoord.x &&
            neighbor.x >= xCoord.x - state.modifier * state.edgeThreshold
        );
        const right = yCoords.filter(
          neighbor =>
            neighbor.x > xCoord.x &&
            neighbor.x <= xCoord.x + state.modifier * state.edgeThreshold
        );

        if (
          (top.length > 0 && bottom.length === 0) ||
          (top.length === 0 && bottom.length > 0)
        ) {
          if (!xEdges[key]) xEdges[key] = [];
          xEdges[key].push(xCoord);
        }
        if (
          (left.length > 0 && right.length === 0) ||
          (left.length === 0 && right.length > 0)
        ) {
          if (!yEdges[key]) yEdges[key] = [];
          yEdges[key].push(xCoord);
        }
      });
    });

    // Then remove the noise by doing another filter
    // await this.removeXNoise(xEdges, yEdges)
    // await this.removeYNoise(xEdges, yEdges)

    Object.keys(xEdges).forEach(key => {
      xEdges[key].forEach(edge => {
        piecePixels[`${edge.x}-${edge.y}`].xEdge = true;
      });
    });

    // console.log(piecePixels);
    Object.keys(yEdges).forEach(key => {
      yEdges[key].forEach(edge => {
        piecePixels[`${edge.x}-${edge.y}`].yEdge = true;
      });
    });
    return { ...pieces, piecePixels, xColumns, yRows, xEdges, yEdges };
  }
};

const checkCorner = (pixel, pixels, modifier, apperature, cornerThreshold) => {
  const { x, y } = pixel;

  let totalAround = 0;

  for (let i = x - apperature; i <= x + apperature; i += modifier) {
    for (let j = y - apperature; j <= y + apperature; j += modifier) {
      totalAround += pixels[`${i}-${j}`] ? 1 : 0;
    }
  }

  if (
    totalAround <= Math.pow(apperature * 2 + 1, 2) * cornerThreshold &&
    totalAround > 3
  ) {
    return true;
  }
};

const checkFor90 = async sourceCorners => {
  let corners = [...Object.keys(sourceCorners)];
  let result = [];
  // console.log(corners)

  corners.forEach(p1Key => {
    //const p1Key = corners[0]
    const p1 = sourceCorners[p1Key];
    let corners2 = corners.slice(1);
    // console.log(corners2)

    corners2.forEach(p2Key => {
      const p2 = sourceCorners[p2Key];

      var p1p2Distance = Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
      );
      if (p1p2Distance > 50) {
        for (let i = 1; i < corners2.length; i++) {
          const p3Key = corners2[i];
          if (p2Key === p3Key) continue;

          const p3 = sourceCorners[p3Key];
          var p1p3Distance = Math.sqrt(
            Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2)
          );

          //let twoPointAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
          let threePointAngle = (findAngle(p2, p1, p3) * 180) / Math.PI;
          console.log(
            `p1:${p1.x},${p1.y} - p2:${p2.x},${p2.y} - p3:${p3.x},${
              p3.y
            } -- p1-p2 distance: ${p1p2Distance} -- p1-p3 distance: ${p1p3Distance} -- p1,p2,p3 angle - ${threePointAngle}`
          );

          if (
            p1p3Distance > 100 &&
            threePointAngle > 80 &&
            threePointAngle < 100
          ) {
            //console.log(`p1:${p1.x},${p1.y} - p2:${p2.x},${p2.y} - p3:${p3.x},${p3.y} -- p1-p2 distance: ${p1p2Distance} -- p1-p3 distance: ${p1p3Distance} -- p1,p2,p3 angle - ${threePointAngle}`)
            result.push({
              p1p2Distance,
              p1p3Distance,
              p1,
              p2,
              p3,
              angle: threePointAngle
            });
          }
        }
      }
    });
    //corners.shift()
  });

  return result;
};

const findAngle = (p1, p2, p3) => {
  var p1p2 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  var p2p3 = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
  var p1p3 = Math.sqrt(Math.pow(p3.x - p1.x, 2) + Math.pow(p3.y - p1.y, 2));
  return Math.acos(
    (p2p3 * p2p3 + p1p2 * p1p2 - p1p3 * p1p3) / (2 * p2p3 * p1p2)
  );
};

const floodFill = (
  data,
  key,
  startX,
  startY,
  width,
  modifier,
  pieceSet,
  piecePixels
) => {
  // If piecePixels already has a value for this pixel, just return the set
  if (!!piecePixels[key]) {
    return { pieceSet, piecePixels, newPieceFound: false };
  }

  // If the pixel is not a piece, add it to piecePixels and return
  const pixel = getPixel(data, startX, startY, width);
  if (!pixel.isPiece) {
    piecePixels[key] = pixel;
    return { pieceSet, piecePixels, newPieceFound: false };
  }

  // Setup the queue to start at the designered points
  let queue = nextPixels(startX, startY, modifier);
  while (queue.length > 0) {
    const { x, y } = queue[0];
    const pixelKey = `${x}-${y}`;

    if (!piecePixels[pixelKey]) {
      const pixel = getPixel(data, x, y, width);
      if (pixel.isPiece) {
        // If it's a piece, find any neighbors to recursively process
        queue.push(...nextPixels(x, y, modifier));

        pieceSet.pixels[pixelKey] = pixel;

        pieceSet.minX =
          !!pieceSet.minX && x > pieceSet.minX ? pieceSet.minX : x;
        pieceSet.maxX =
          !!pieceSet.maxX && x < pieceSet.maxX ? pieceSet.maxX : x;
        pieceSet.minY =
          !!pieceSet.minY && y > pieceSet.minY ? pieceSet.minY : y;
        pieceSet.maxY =
          !!pieceSet.maxY && y < pieceSet.maxY ? pieceSet.maxY : y;
      }
      piecePixels[pixelKey] = pixel;
    }

    // remove this item from the queue so we don't keep processing it
    queue.shift();
  }

  return { pieceSet, piecePixels, newPieceFound: true };
};

const nextPixels = (x, y, modifier) => {
  return [
    { x: x + modifier, y },
    { x: x - modifier, y },
    { x, y: y + modifier },
    { x, y: y - modifier }
  ];
};

const getPixel = (data, x, y, width) => {
  const index = (x + y * width) * 4;
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];

  const min = 100;

  if (r < min && g < min && b < min) {
    return { x, y, isPiece: true, r, g, b };
  }
  return { isPiece: false, r, g, b, x, y };
};

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
