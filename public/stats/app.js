(function(){


var app = angular.module('app', ['ngRoute', 'ngMaterial', 'ngCookies']);

app.config(function($routeProvider, $mdThemingProvider){

  $mdThemingProvider.theme('default').
    primaryPalette('indigo', {
      'default': '500',
      'hue-1': '50'
    }).accentPalette('red', {
      'default': '700'
    })

  $mdThemingProvider.setDefaultTheme('default')

  $routeProvider.
  when('/', {
    redirectTo: '/overview'
  }).
  when('/overview',{
    templateUrl: 'stats/_overview.html',
    controller: 'OverviewCtrl'
  }).
  when('/compare',{
    templateUrl: 'stats/_threeteams.html',
    controller: 'TeamCtrl'
  }).
  when('/teams',{
    templateUrl: 'stats/_teams.html',
    controller: 'OverviewCtrl'
  }).
  when('/averages',{
    templateUrl: 'stats/_averages.html',
    controller: 'AveragesCtrl'
  }).
  when('/team/:id', {
    templateUrl: 'stats/_team.html',
    controller: 'TeamCtrl'
  }).
  otherwise({ redirectTo: '/overview' })

});

app.filter('objectOnly', function(){
  return function(items){
    var filtered = {}
    Object.keys(items).forEach(function(key) {
      if(typeof items[key] == 'object')
        filtered[key] = items[key]
    })

    return filtered
  }
});

app.controller('AppCtrl', function($mdSidenav, $scope, $location, $http, $cookies) {
  $scope.toggleSideNav = function(menuId) {
    $mdSidenav(menuId).toggle();
  };

  $scope.menu = [
    {
      title: 'Overview',
      icon: 'dashboard',
      path: '/overview'
    },
    {
      title: 'Teams',
      icon: 'list',
      path: '/teams'
    },
    {
      title: 'Compare',
      icon: 'compare_arrows',
      path: '/compare'
    },
    {
      title: 'Averages',
      icon: 'reorder',
      path: '/averages'
    },
    /*{ // to be re-implemented when the time comes
        title: 'Pit Scout',
        icon: 'create',
        path: '/scout/pit'
    },
    {
        title: 'Match Scout',
        icon: 'add',
        path: '/scout/match'
    },
    {
        title: 'Edit Match',
        icon: 'assignment',
        path: '/editmatch'
    }*/
  ];

  $scope.scoreToData = {
    'A_Portcullis': 'port',
    'A_ChevalDeFrise': 'cheval',
    'B_Ramparts': 'ramp',
    'B_Moat': 'moat',
    'C_SallyPort': 'sally',
    'C_Drawbridge': 'draw',
    'D_RockWall': 'rock',
    'D_RoughTerrain': 'rough'
  }

  $scope.defenses = {
    'port': 'Portcullis',
    'cheval': 'Cheval de Frise',
    'ramp': 'Ramparts',
    'moat': 'Moat',
    'sally': 'Sally Port',
    'draw': 'Draw Bridge',
    'rock': 'Rock Wall',
    'rough': 'Rough Terrain',
    'low': 'Low Bar'
  }

  $scope.setPath = function(path) {
      $mdSidenav('left').close();
      $location.path(path)
  }

  $scope.selectedTeams = []

  $scope.toggleSelected = function(num) {
    if($scope.selectedTeams.indexOf(num) > -1) {
      $scope.selectedTeams.splice($scope.selectedTeams.indexOf(num), 1)
    } else {
      $scope.selectedTeams.push(num)
    }
  }

  $scope.teams = {}
  $scope.tournament = {
    matches: [],
    scores: []
  }
  $scope.match = {}
  $scope.numMatches = 0
  $scope.numTeams = 0
  $scope.eventCode = $cookies.get('eventCode') || ''

  var emptyTeam = function(){
    return {
      pit: {},
      matches: [],
      picks: {
        'port': 0,
        'cheval': 0,
        'ramp': 0,
        'moat': 0,
        'sally': 0,
        'draw': 0,
        'rock': 0,
        'rough': 0,
      },
      totalMatches: 0
    }
  }

  $scope.teamList = []

  $scope.getTeams = function(num) {
    if(!num)
      num = 1
    console.log("Getting teams page",num)
    $http.get('/api/teams?eventCode='+$scope.eventCode+"&page="+num).success(function(resp){
      if(resp.pageCurrent == 1)
        $scope.teamList = []

      if(!resp.teams)
        return
      $scope.teamList = $scope.teamList.concat(resp.teams)
      resp.teams.forEach(function(team){
        if(!$scope.teams[team.teamNumber])
          $scope.teams[team.teamNumber] = emptyTeam()

        $scope.teams[team.teamNumber].meta = team
      })
      if(resp.pageCurrent < resp.pageTotal)
        $scope.getTeams(parseInt(resp.pageCurrent) + 1)
    })
  }

  $scope.updateTeams = function(){

    $scope.getTeams()

    $http.get('/api/schedule/'+$scope.eventCode+'/qual').success(function(data){
      $scope.tournament.matches = data.Schedule
      $scope.tournament.matches.forEach(function(match) {
        $scope.match[match.description.substr(0, 4) + " " + match.description.split(' ')[1]] = match
      })

      $http.get('/api/scores/'+$scope.eventCode+'/qual').success(function(data){
        $scope.tournament.scores = data.MatchScores
        $scope.tournament.scores.forEach(function(score) {
          var match = $scope.match[score.matchLevel.substr(0, 4) + " " + score.matchNumber]
          for(var i = 0; i < 2; i++) {
            var alliance = score.Alliances[i].alliance
            match['score'+alliance+'Final'] = score.Alliances[i].totalPoints
            match['picks'+alliance] = [
              score.Alliances[i].position2,
              score.Alliances[i].position4,
              score.Alliances[i].position5
            ].map(function(d){return $scope.scoreToData[d]})
            
          }

          match.Teams.forEach(function(team){
            var teamNumber = team.teamNumber
            if(!$scope.teams[teamNumber]) {
              $scope.teams[teamNumber] = emptyTeam()
            }
            var side = team.station.substr(0, team.station.length-1)
            $scope.teams[teamNumber].totalMatches ++

            if(!$scope.teams[teamNumber].totalPoints) {
              $scope.teams[teamNumber].totalPoints = 0
              $scope.teams[teamNumber].totalMatches = 0
            }

            $scope.teams[teamNumber].totalPoints += match['score'+side+'Final']
            $scope.teams[teamNumber].totalMatches ++

            match['picks'+side].forEach(function(def){
              $scope.teams[teamNumber].picks[def] ++
            })

          })

        })
      })
    })


    $http.get('/data').success(function(data){
      $scope.scoutedFiles = Object.keys(data)
      $scope.numMatches = 0
      $scope.numTeams = 0
      for(var filename in data){
        var scoutData = data[filename]
        if(filename.startsWith('/data/pit_'))
          $scope.numTeams ++;
        else
          $scope.numMatches ++;

        filename = filename.split("_")
        var match = /[^\/]+$/.exec(filename[0])[0], team = /\d+/.exec(filename[1])[0]
        if(!$scope.teams[team]) {
          $scope.teams[team] = emptyTeam()
        }
        if(match == 'pit') {
          $scope.teams[team].pit = scoutData
        } else {
          scoutData.matchShort = match
          $scope.teams[team].matches.push(scoutData)
          if(!$scope.match[match])
            continue
          scoutData.matchName = $scope.match[match].description
        }
      }
    })
  }

  $scope.getAvg = function(type, teamNum, useRatio) {

    var num = 0
    var total = 0
    var missType = !type.match(/miss/) ? type.charAt(0)+'miss' : ''
    if(!$scope.teams[teamNum] || !$scope.teams[teamNum].matches.length)
      return 'n/a'

    for(var i in $scope.teams[teamNum].matches) {
      var match = $scope.teams[teamNum].matches[i]
      for(var j in match.tele.shots) {
        var shot = match.tele.shots[j]
        if(shot.goal == type) {
          num ++
          total ++
        }
        if(shot.goal == missType) {
          total ++
        }
      }
    }
    var avg =  Math.floor(num / $scope.teams[teamNum].matches.length * 10 + 0.5)/10
    var ratio = (Math.floor(num / total * 100)/100)
    if(total == 0)
      useRatio = false
    return avg + (useRatio ? " ("+ratio+")" : 0)
  }


  $scope.updateTeams();

});


app.controller('OverviewCtrl', function($scope, $location, $mdToast, $cookies, $http) {

  $scope.lastMatchData = []
  $scope.numScoutedTeams = 0

  $scope.updateEventCode = function() {
    $http.get('/api/schedule/'+$scope.eventCode+'/qual').success(function(resp){
      $cookies.put('eventCode', $scope.eventCode)
      location.reload()
    }).error(function(){
       $mdToast.show($mdToast.simple().textContent("Bad Event Code"));
    })
  }

  $scope.updateMatchData = function() {
    //$scope.lastMatchData = $scope.getLastMatch()
    $scope.numScoutedTeams = Object.keys($scope.teams).length
    console.log('updated')
  }

  $scope.$on('updateTeams', $scope.updateMatchData)
  if(!$scope.lastMatchData.length) {
    //$scope.updateMatchData();
  }

});

app.controller('TeamCtrl', function($scope, $routeParams, $location){
  console.log($routeParams.id)
  $scope.teamNumber = $routeParams.id

  $scope.defenses = {
    'port': 'Portcullis',
    'cheval': 'Cheval de Frise',
    'ramp': 'Ramparts',
    'moat': 'Moat',
    'sally': 'Sally Port',
    'draw': 'Draw Bridge',
    'rock': 'Rock Wall',
    'rough': 'Rough Terrain',
    'low': 'Low Bar'
  }

  $scope.select = function(match, index) {
    index = Math.floor(index/3)

    $scope.selectedTeams = match.Teams
      .slice(index*3, index*3+3)
      .map(function(t){
        console.log(t.teamNumber)
        return t.teamNumber
      })
  }

  $scope.attempts = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'
    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          total += match.tele.defenses[k].length
          break
        }
      }

    }
    return total
  }

  $scope.stuck = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]

      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          for(var j in match.tele.defenses[k]) {
            if(!match.tele.defenses[k][j])
              total ++;
          }
        }
      }


    }
    return total
  }

  $scope.tortuga = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]

      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          for(var j in match.tele.defenses[k]) {
            if(match.tele.defenses[k][j] == -1)
              total ++;
          }
        }
      }


    }
    return total
  }

  $scope.opportunities = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          total ++
          break
        }
      }

    }
    return total
  }

  $scope.percent = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var opportunities = 0;
    var attempts = 0

    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          attempts += !!match.tele.defenses[k].length
          opportunities ++
          break
        }
      }

    }
    
    if(!opportunities)
      return "n/a"

    return Math.floor(attempts / opportunities * 100) + "%"
  }

  $scope.showhigh = true
  $scope.showlow = true
  $scope.showhmiss = true
  $scope.showlmiss = true

  $scope.colors = {
    high: "#afa",
    low: "#aaf",
    hmiss: "#afa",
    lmiss: "#aaf"
  }

  $scope.renderMatchShots = function(ctx, match) {
    for(var j = 0; j < match.tele.shots.length; j++) {
      var shot = match.tele.shots[j]
      if(!$scope['show'+shot.goal])
        continue;
      ctx.strokeStyle=$scope.colors[shot.goal]
      if(shot.goal.endsWith("miss")) {
        ctx.beginPath()
        ctx.moveTo(shot.x*200-5,shot.y*200-5)
        ctx.lineTo(shot.x*200+5,shot.y*200+5)
        ctx.moveTo(shot.x*200+5,shot.y*200-5)
        ctx.lineTo(shot.x*200-5,shot.y*200+5)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(shot.x*200, shot.y*200, 5, 0, 6.29)
        ctx.stroke()            
      }

    }
  }

  $scope.showMatchShots = function(match, id) {
    setTimeout(function(){
      var canvas = document.getElementById('fieldcanvas'+id)
      var ctx = canvas.getContext('2d')
      ctx.canvas.width = ctx.canvas.height = 200
      var img = document.getElementById('halffieldimg')
      ctx.drawImage(img, 0, 0, 200, 200);
      ctx.lineWidth=3
      $scope.renderMatchShots(ctx, match)
    }, 500)
  }

  $scope.showShots = function(teamNum, timeout) {
    if(!teamNum) {
      $scope.selectedTeams.forEach($scope.showShots)
      return;
    }

    setTimeout(function(){
      var canvas = document.getElementById('fieldcanvas'+teamNum)
      var ctx = canvas.getContext('2d')
      ctx.canvas.width = ctx.canvas.height = 200
      var img = document.getElementById('halffieldimg')
      ctx.drawImage(img, 0, 0, 200, 200);
      ctx.lineWidth=3
      
      for(var i = 0; i < $scope.teams[teamNum].matches.length; i++) {
        var match = $scope.teams[teamNum].matches[i]
        $scope.renderMatchShots(ctx, match)
      }
    }, (timeout ? 500 : 0))
  }

});

app.controller('AveragesCtrl', function($scope, $timeout){

  // an array of teams rather than an object of teams
  $scope._teams = Object.keys($scope.teams).map(function(num){return $scope.teams[num]})
  // default order by team number
  $scope.order = 'meta.teamNumber'
  $scope.reverse = true
  $scope.isFriday = false
  $scope.reverseOrder = {}

  $scope.deductPoints = true

  // sets the order if it's a different order, otherwise reverses the current order
  $scope.setOrder = function(order) {
    if(order == $scope.order) {
      $scope.reverse = !$scope.reverse
      $scope.reverseOrder[order] = $scope.reverse
    }
    $scope.order = order
  }

  $scope.selection = {}
  $scope.combined = 0
  $scope.select = function(pos, team) {
    // set the current selected (effective/first/second)
    $scope.selection[pos] = team

    // combine the first second and third scores
    $scope.combined = Math.floor(100*(
      $scope.selection.effective.avg.effective+
      $scope.selection.first.avg.firstround+
      $scope.selection.second.avg.secondround
    ))/100

  }

  // checks if the team is in the selection
  $scope.isSelected = function(team) {
    if(!$scope.isFriday)
      return false
    
    for(var k in $scope.selection) {
      if($scope.selection[k] == team)
        return true
    }
    return false
  }

  // recursive function for getting an attribute from a nested object
  function itemFromPath(obj, path) {
    if(path.length == 0)
      return obj
    try {
      return itemFromPath(obj[path[0]],path.slice(1))
    } catch(e) {
      return undefined
    }
  }

  // search paths (['tele','shot'] == match.tele.shot)
  var search = {
    'a_outerworks': ['auto','outerworks'],
    'a_crossed': ['auto','crossed'],
    'a_ball': ['auto','ball'],
    'a_drop': ['auto','drop'],
    'a_low': ['auto','low'],
    'a_high': ['auto','high'],
    'a_hmiss': ['auto','hmiss'],

    'getball': ['ball','getball'],
    'carryball': ['ball','carry'],
    'dropball': ['ball','drop'],

    'capture': ['other','capture'],
    'breach': ['other','breach'],
    'helpover': ['other','helpover'],
    'defend': ['other','defend'],
    'challenged': ['other','challenged'],
    'scalelift': ['other','scalelift'],
    'foul': ['other','foul'],
    'tecfoul': ['other','tecfoul'],
  }

  // goes through a team and finds its averages
  $scope.calcAverages = function(teamNum) {
    var team = $scope.teams[teamNum]

    team.teamNumber = parseInt(teamNum)
    team.teamName = (team.meta ? team.meta.nameShort : team.pit.teamName) || '-'

    // create an object to hold averages
    var averages = {
      high: $scope.getAvg('high', teamNum),
      hmiss: $scope.getAvg('hmiss', teamNum),
      highR: $scope.getAvg('high', teamNum, true),
      low: $scope.getAvg('low', teamNum),
      cross: 0,
      effective: 0,
      effectivetele: 0,
      effectiveauto: 0,
      effectiveend: 0,
      firstround: 0,
      secondfound: 0
    }

    var numMatches = team.matches.length
    // assign default values
    for(var k in search) {
      averages[k] = 0
    }

    // create totals from each searched item on each match
    team.matches.forEach(function(match) {
      for(var k in match.tele.defenses) {
        var arr = match.tele.defenses[k]
        for(var i in arr) {
          if(arr[i] == 1)
            averages.cross ++
        }
      }
      for(var k in search) {
        var val = itemFromPath(match, search[k])
        var type = typeof val
        if(type == 'boolean' && val)
          averages[k] ++
        else if(type == 'number')
          averages[k] += val
      }
    })

    // round and calculate averages
    for(var k in search) {
      averages[k] = Math.round(averages[k]/numMatches*100)/100
    }
    averages.cross = Math.round(averages.cross/numMatches*100)/100


    // weighted averages
    averages.effective = (
      2 * averages.a_outerworks +
      5 * averages.a_crossed +
      0.5 * averages.a_ball +
      ($scope.deductPoints?-0.5 * averages.a_drop:0) +
      4 * averages.a_low +
      9 * averages.a_high +
      ($scope.deductPoints?-6 * averages.a_hmiss:0) +
      5 * averages.cross +
      3 * averages.helpover +
      0.5 * averages.getball +
      0.5 * averages.carryball +
      ($scope.deductPoints?-0.5 * averages.dropball:0) +
      1 * averages.low +
      4 * averages.high +
      ($scope.deductPoints?-6 * averages.hmiss:0) +
      1 * averages.defend +
      5 * averages.challenged +
      15 * averages.scalelift +
      ($scope.deductPoints?-5 * averages.foul:0) +
      ($scope.deductPoints?-10 * averages.tecfoul:0)
    )

    averages.effectiveauto = (
      2 * averages.a_outerworks +
      5 * averages.a_crossed +
      0.5 * averages.a_ball +
      ($scope.deductPoints?-0.5 * averages.a_drop:0) +
      4 * averages.a_low +
      9 * averages.a_high +
      ($scope.deductPoints?-6 * averages.a_hmiss:0)
    )

    averages.effectivetele = (
      5 * averages.cross +
      3 * averages.helpover +
      0.5 * averages.getball +
      0.5 * averages.carryball +
      ($scope.deductPoints?-0.5 * averages.dropball:0) +
      1 * averages.low +
      4 * averages.high +
      ($scope.deductPoints?-6 * averages.hmiss:0) +
      1 * averages.defend
    )

    averages.effectiveend = (
      5 * averages.challenged +
      15 * averages.scalelift +
      ($scope.deductPoints?-5 * averages.foul:0) +
      ($scope.deductPoints?-10 * averages.tecfoul:0)
    )

    averages.firstround = (
      2 * averages.a_outerworks +
      10 * averages.a_crossed +
      0.5 * averages.a_ball +
      ($scope.deductPoints?-0.5 * averages.a_drop:0) +
      4 * averages.a_low +
      9 * averages.a_high +
      ($scope.deductPoints?-6 * averages.a_hmiss:0) +
      5 * averages.cross +
      3 * averages.helpover +
      0.5 * averages.getball +
      0.5 * averages.carryball +
      ($scope.deductPoints?-0.5 * averages.dropball:0) +
      2 * averages.low +
      4 * averages.high +
      ($scope.deductPoints?-6 * averages.hmiss:0) +
      1 * averages.defend +
      5 * averages.challenged +
      15 * averages.scalelift +
      ($scope.deductPoints?-5 * averages.foul:0) +
      ($scope.deductPoints?-10 * averages.tecfoul:0)
    )

    averages.secondround = (
      2 * averages.a_outerworks +
      15 * averages.a_crossed +
      0.5 * averages.a_ball +
      ($scope.deductPoints?-0.5 * averages.a_drop:0) +
      4 * averages.a_low +
      9 * averages.a_high +
      ($scope.deductPoints?-6 * averages.a_hmiss:0) +
      5 * averages.cross +
      3 * averages.helpover +
      0.5 * averages.getball +
      0.5 * averages.carryball +
      ($scope.deductPoints?-0.5 * averages.dropball:0) +
      1 * averages.low +
      0 * averages.high +
      0 * averages.hmiss +
      1 * averages.defend +
      5 * averages.challenged +
      15 * averages.scalelift +
      ($scope.deductPoints?-5 * averages.foul:0) +
      ($scope.deductPoints?-10 * averages.tecfoul:0)
    )


    // round weighted averages
    averages.effective = Math.round(averages.effective*100)/100
    averages.effectiveauto = Math.round(averages.effectiveauto*100)/100
    averages.effectivetele = Math.round(averages.effectivetele*100)/100
    averages.effectiveend = Math.round(averages.effectiveend*100)/100
    averages.firstround = Math.round(averages.firstround*100)/100
    averages.secondround = Math.round(averages.secondround*100)/100

    // assign our averages object to the team
    $scope.teams[teamNum].avg = averages

  }

  // calculate all averages for each team
  Object.keys($scope.teams).forEach($scope.calcAverages)

  $scope.toggleDeduct = function() {
    $scope.deductPoints = !$scope.deductPoints
    Object.keys($scope.teams).forEach($scope.calcAverages)
  }

})

})();
