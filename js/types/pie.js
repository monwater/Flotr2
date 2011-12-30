/** Pie **/
/**
 * Formats the pies labels.
 * @param {Object} slice - Slice object
 * @return {String} Formatted pie label string
 */
(function () {

var
  _ = Flotr._;

Flotr.defaultPieLabelFormatter = function (total, value) {
  return (100 * value / total).toFixed(2)+'%';
};

Flotr.addType('pie', {
  options: {
    show: false,           // => setting to true will show bars, false will hide
    lineWidth: 1,          // => in pixels
    fill: true,            // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillColor: null,       // => fill color
    fillOpacity: 0.6,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    explode: 6,            // => the number of pixels the splices will be far from the center
    sizeRatio: 0.6,        // => the size ratio of the pie relative to the plot 
    startAngle: Math.PI/4, // => the first slice start angle
    labelFormatter: Flotr.defaultPieLabelFormatter,
    pie3D: false,          // => whether to draw the pie in 3 dimenstions or not (ineffective) 
    pie3DviewAngle: (Math.PI/2 * 0.8),
    pie3DspliceThickness: 20
  },

  draw : function (options) {

    // TODO 3D charts what?

    var
      data          = options.data,
      context       = options.context,
      canvas        = context.canvas,
      lineWidth     = options.lineWidth,
      shadowSize    = options.shadowSize,
      sizeRatio     = options.sizeRatio,
      height        = options.height,
      explode       = options.explode,
      color         = options.color,
      fill          = options.fill,
      fillStyle     = options.fillStyle,
      radius        = Math.min(canvas.width, canvas.height) * sizeRatio / 2,
      value         = data[0][1],
      html          = [],
      vScale        = 1,//Math.cos(series.pie.viewAngle);
      measure       = Math.PI * 2 * value / this.total,
      startAngle    = this.startAngle || (2 * Math.PI * options.startAngle), // TODO: this initial startAngle is already in radians (fixing will be test-unstable)
      endAngle      = startAngle + measure,
      bisection     = startAngle + measure / 2,
      label         = options.labelFormatter(this.total, value),
      //plotTickness  = Math.sin(series.pie.viewAngle)*series.pie.spliceThickness / vScale;
      alignRight    = (Math.cos(bisection) < 0),
      alignTop      = (Math.sin(bisection) > 0),
      explodeCoeff  = explode + radius + 4,
      style,
      x, y,
      distX, distY;
    
    context.save();

    context.translate(options.offsetLeft, options.offsetTop);
    context.translate(options.width / 2, options.height / 2);

    context.scale(1, vScale);


    // TODO wtf is this for?
    if (startAngle == endAngle) return;

    x = Math.cos(bisection) * explode;
    y = Math.sin(bisection) * explode;

    // Shadows
    if (shadowSize > 0) {
      this.plotSlice(x + shadowSize, y + shadowSize, radius, startAngle, endAngle, context);
      if (fill) {
        context.fillStyle = 'rgba(0,0,0,0.1)';
        context.fill();
      }
    }

    this.plotSlice(x, y, radius, startAngle, endAngle, context);
    if (fill) {
      context.fillStyle = fillStyle;
      context.fill();
    }
    context.lineWidth = lineWidth;
    context.strokeStyle = color;
    context.stroke();

    distX = Math.cos(bisection) * explodeCoeff;
    distY = Math.sin(bisection) * explodeCoeff;
    style = {
      size : options.fontSize * 1.2,
      color : options.fontColor,
      weight : 1.5
    };

    if (label) {
      if (options.htmlText || !options.textEnabled) {
        // TODO HTML text is broken here.
        var yAlignDist = textAlignTop ? (distY - 5) : (height - distY + 5),
            divStyle = 'position:absolute;' + (textAlignTop ? 'top' : 'bottom') + ':' + yAlignDist + 'px;'; //@todo: change
        if (textAlignRight)
          divStyle += 'right:'+(this.canvasWidth - distX)+'px;text-align:right;';
        else 
          divStyle += 'left:'+distX+'px;text-align:left;';
        html.push('<div style="', divStyle, '" class="flotr-grid-label">', label, '</div>');
      }
      else {
        style.textAlign = alignRight ? 'right' : 'left';
        style.textBaseline = alignTop ? 'top' : 'bottom';
        Flotr.drawText(context, label, distX, distY, style);
      }
    }
    
    if (options.htmlText || !options.textEnabled) {
      var div = Flotr.DOM.node('<div style="color:' + options.fontColor + '" class="flotr-labels"></div>');
      Flotr.DOM.insert(div, html.join(''));
      Flotr.DOM.insert(this.el, div);
    }
    
    context.restore();

    // New start angle
    this.startAngle = endAngle;
    this.slices = this.slices || [];
    this.slices.push({
      explode : explode,
      start : startAngle,
      end : endAngle
    });
  },
  plotSlice : function (x, y, radius, startAngle, endAngle, context) {
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, radius, startAngle, endAngle, false);
    context.lineTo(x, y);
    context.closePath();
  },
  hit : function (options) {

    var
      data      = options.data[0],
      context   = options.context,
      canvas    = context.canvas,
      args      = options.args,
      sizeRatio = options.sizeRatio,
      index     = options.index,
      slice     = this.slices[index],
      mouse     = args[0],
      n         = args[1],
      radius    = Math.min(canvas.width, canvas.height) * sizeRatio / 2,
      dx        = mouse.relX - options.width / 2,
      dy        = mouse.relY - options.height / 2,
      dr        = Math.sqrt(dx * dx + dy * dy);
      theta     = Math.atan(dy / dx),
      circle    = Math.PI * 2,
      explode   = slice.explode || options.explode,
      start     = slice.start % circle,
      end       = slice.end % circle;

    if (dx < 0) {
      theta += Math.PI;
    } else if (dx > 0 && dy < 0) {
      theta += circle;
    }

    if (dr < radius + explode && dr > explode) {
      if ((start > end && (theta < end || theta > start))
        || (theta > start && theta < end)) {

        // TODO Decouple this from hit plugin (chart shouldn't know what n means)
         n.x = data[0];
         n.y = data[1];
         n.sAngle = start;
         n.eAngle = end;
         n.index = 0;
         n.seriesIndex = index;
         n.fraction = data[1] / this.total;
      }
    }
  },
  drawHit: function(n){
    var octx = this.octx,
      s = n.series,
      xa = n.xaxis,
      ya = n.yaxis;

    octx.save();
    octx.translate(this.plotOffset.left, this.plotOffset.top);
    octx.beginPath();

    if (s.mouse.trackAll) {
      octx.moveTo(xa.d2p(n.x), ya.d2p(0));
      octx.lineTo(xa.d2p(n.x), ya.d2p(n.yaxis.max));
    }
    else {
      var center = {
        x: (this.plotWidth)/2,
        y: (this.plotHeight)/2
      },
      radius = (Math.min(this.canvasWidth, this.canvasHeight) * s.pie.sizeRatio) / 2,

      bisection = n.sAngle<n.eAngle ? (n.sAngle + n.eAngle) / 2 : (n.sAngle + n.eAngle + 2* Math.PI) / 2,
      xOffset = center.x + Math.cos(bisection) * n.series.pie.explode,
      yOffset = center.y + Math.sin(bisection) * n.series.pie.explode;
      
      octx.beginPath();
      octx.moveTo(xOffset, yOffset);
      if (n.fraction != 1)
        octx.arc(xOffset, yOffset, radius, n.sAngle, n.eAngle, false);
      else
        octx.arc(xOffset, yOffset, radius, n.sAngle, n.eAngle-0.00001, false);
      octx.lineTo(xOffset, yOffset);
      octx.closePath();
    }

    octx.stroke();
    octx.closePath();
    octx.restore();
  },
  clearHit: function(){
    var center = {
      x: this.plotOffset.left + (this.plotWidth)/2,
      y: this.plotOffset.top + (this.plotHeight)/2
    },
    pie = this.prevHit.series.pie,
    radius = (Math.min(this.canvasWidth, this.canvasHeight) * pie.sizeRatio) / 2,
    margin = (pie.explode + pie.lineWidth) * 4;
      
    this.octx.clearRect(
      center.x - radius - margin, 
      center.y - radius - margin, 
      2*(radius + margin), 
      2*(radius + margin)
    );
  },
  extendYRange : function (axis, data) {
    this.total = (this.total || 0) + data[0][1];
  }
});
})();
