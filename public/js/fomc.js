(function(){

var fomc = []
,   selected
,   chart = venn
        .VennDiagram()
        .width(800)
        .height(500)
        .padding(75)
,   time = 0
;

d3.json("data/fomc.json", function(error, data) {
    if (error) return alert(error.statusText);
    fomc = data;
    _.each(data, function (item) { item.x = 400; item.y = 250; });
    addMembers(data);
    updateVenn();
});

d3.select("#groups").on("click", function () { setTimeout(updateVenn, 1); });

function addMembers(data) {
    d3.select("#fomc").selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function (item) { return item.surname; })
        .attr("id", function (item, n) { return ("member" + n); })
        .attr("x", _.property("x"))
        .attr("y", _.property("y"))
        .attr("class", "fomc")
        .attr("text-anchor", "middle")
        ;
    d3.select("#members").selectAll("div")
        .data(data)
        .enter()
        .append("div")
        .attr("for", function (item, n) { return ("member" + n); })
        .attr("class", "mdl-tooltip")
        ;
    d3.select("#members").selectAll("div")
        .each(function (item) {
            var sel = d3.select(this);
            sel.append("div").attr("class", "image").style(item.image);
            sel.append("div").text(_.property("name"));
            sel.append("div").text(_.property("title"));
            sel.append("div").text(function (item) {
                return (item.bank ? "FRB of " + item.bank : "Board of Governors");
            });
            componentHandler.upgradeElement(this);
        })
        ;
    updateMembers();
}

function calcMove(point, other, weight) {
    var dx = point.x - other.x
    ,   dy = point.y - other.y
    ,   d2 = dx * dx + dy * dy
    ,   d = Math.sqrt(d2)
    ,   r = other.radius || 0
    ,   r2 = r * r
    ,   b = other.radius ? 5 : 0.3
    ;
    if (weight < 0) {
        weight *= (d < r) ? Math.exp(0.02 * (d - r)) : 1;
    } else {
        weight *= (d > r) ? Math.exp(0.02 * (r - d)) : 1;
    }
    if (d < 1) {
        dx = 10 - 5 * Math.random();
        dy = 10 - 5 * Math.random();
        d2 = dx * dx + dy * dy;
        d = Math.sqrt(d2);
    }
    point.dx = (point.dx || 0) + weight * dx / d;
    point.dy = (point.dy || 0) + weight * dy / d;
    return weight;
}

function getSelected() {
    var result = [];
    d3.selectAll("#groups tr.is-selected td:last-child").each(function () {
        result.push(d3.select(this).text());
    });
    return result;
}

function getSetIntersections(data) {
    var result = []
    ,   members = []
    ;
    _.forEach(data, function (group) {
        var who = _.where(fomc, { groups: [ group ] });
        result.push({
            sets: [ group ],
            size: who.length,
            who: who
        });
        members.push(who);
    });
    if (data.length > 1) {
        result.push({
            sets: [ result[0].sets[0], result[1].sets[0] ],
            size: _.intersection(members[0], members[1]).length
        });
    }
    if (data.length > 2) {
        result.push({
            sets: [ result[0].sets[0], result[2].sets[0] ],
            size: _.intersection(members[0], members[2]).length
        });
        result.push({
            sets: [ result[1].sets[0], result[2].sets[0] ],
            size: _.intersection(members[1], members[2]).length
        });
        result.push({
            sets: [ result[0].sets[0], result[1].sets[0], result[2].sets[0] ],
            size: _.intersection(members[0], members[1], members[2]).length
        });
    }
    return result;
}

function moveMembers(circles)
{
    var delta = 0;
    for (var j = 0; j < fomc.length; j++)
    {
        var point = fomc[j];
        delta += calcMove(point, { x: 400, y: 250, radius: 250 }, -10);
        for (var k = 0; k < circles.length; k++)
        {
            var weight =_.includes(point.groups, circles[k].sets[0]) ? -10 : 10;
            delta += calcMove(point, circles[k], weight);
        }
        for (var k = 0; k < fomc.length; k++)
        {
            if (j == k) continue;
            delta += calcMove(point, fomc[k], 10);
        }
        point.x += point.dx;
        point.y += point.dy;
        delete point.dx;
        delete point.dy;
    }
    return delta;
}

function updateMembers()
{
    var circles = [];
    d3.selectAll("#venn g.venn-circle path").each(function (data) {
        var path = d3.select(this).attr("d");
        if (!path) return;
        circle = venn.circleFromPath(path);
        _.assign(circle, data);
        circles.push(circle);
    });
    for (var i = 0; i < 500; i++)
    {
        var delta = moveMembers(circles);
        //if (delta < (fomc.length * 0.75)) break;
    }
    d3.selectAll("#fomc text")
        .transition()
        .attr("x", _.property("x"))
        .attr("y", _.property("y"))
        ;
}

function updateVenn() {
    var data = getSelected();
    if (selected && _.isEqual(data, selected)) {
        return;
    }
    selected = data;
    if (window.ga) {
        ga('send', 'event', 'interaction', 'venn', selected.join(","));
    }
    if (data.length === 0 || data.length > 3) {
        d3.select("#venn").datum([]).selectAll("g.venn-area").remove();
        updateMembers();
        return;
    }
    data = getSetIntersections(data);
    d3.select("#venn").datum(data).call(chart);
    setTimeout(updateMembers, 1000);
}

})();
