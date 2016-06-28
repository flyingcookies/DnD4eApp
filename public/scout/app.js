
(function(){

var app = angular.module('app', ['ngRoute', 'ngCookies']);

app.config(function($routeProvider){

  $routeProvider.
  when('/', {
    templateUrl: '_scout',
  }).
  otherwise({ redirectTo: '/' })

});

app.filter('five', function() {
  return function(arr) {
    return arr.reverse().slice(0, Math.min(5, arr.length))
  };
});


app.controller('AppCtrl', function($scope, $location, $http, $cookies, $timeout) {

  if(navigator.userAgent.match(/iPad/i)) {
    $('body').css('zoom','170%')
  }

  $scope.setPath = function(path) {
      $location.path(path)
  }

  $scope.notifications = []

  $scope.notify = function(msg, warn) {
    var note = {
      msg: msg,
      create: new Date().getTime(),
      warn: warn
    }
    $scope.notifications.push(note)
    $timeout(function(){$scope.removeNote(note)}, 5000)
    console.log(msg)
  }

  $scope.removeNote = function(note) {
    var index = $scope.notifications.indexOf(note)
    if(index > -1)
      $scope.notifications.splice(index, 1)
  }

  $scope.emptyMatchScout = function(){
    return {
      defenses: {1:'low'},
      auto: {},
      tele: {
        defenses: {1:[],2:[],3:[],4:[],5:[]},
        shots: [],
      },
      ball: {},
      other: {}
    }
  }

  $scope.emptyPitScout = function() {
    return {
      main: {},
      auto: {},
      tele: {},
      abilities: {},
      other: {}
    }
  }

  $scope.getScout = function() {
    switch($scope.currTab) {
      case 'pit':
        if(!$scope.pitQueue.length) {
          return $scope.emptyPitScout();
          break;
        }

        var team = $scope.pitQueue[$scope.currTeam]
        var scout = $cookies.getObject("pit_"+team) || $scope.emptyPitScout();
        scout.main.teamNumber = team
        if($scope.team[team])
          scout.main.teamName = $scope.team[team].nameShort
        return scout
        break;

      case 'match':
        if(!Object.keys($scope.matches).length) {
          return $scope.emptyMatchScout()
          break;
        }

        var matches = $scope.matches[$scope.currMatch]
        if(!matches || !matches.length)
            return $scope.emptyMatchScout()

        var match = matches[0]
        if($cookies.getObject("scout_"+match))
          console.log(match,'has cookie')
        else if($scope.matchBackup['scout_'+match])
          console.log(match,'has backup')
        else
          console.log(match,'using empty')
        return $cookies.getObject("scout_"+match) || $scope.matchBackup['scout_'+match] || $scope.emptyMatchScout()
        break;
    }
  }

  $scope.clickX =  0
  $scope.clickY = 0

  $scope.updating = false
  
  $scope._eventCode = $scope.eventCode = $cookies.get('eventCode') || ''
  $scope._scoutSide = $scope.scoutSide = $cookies.get('scoutSide') || ''

  $scope.currTab = $cookies.get('currTab') || 'pit'
  $scope.path = []

  $scope.matches = []
  $scope.matches = $cookies.getObject('matches') || []
  $scope.scoutedMatches = $cookies.getObject('scoutedMatches') || {}
  Object.keys($cookies.getAll()).forEach(function(key) {
    if(key.startsWith('scout_')) {
      var name = key.split('_')[1]
      if(!$scope.scoutedMatches[name]) {
        $scope.scoutedMatches[name] = true
        $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
      }
      
    }
  })
  $scope.currMatch = parseInt($cookies.get('currMatch') || '0')
  $timeout(function(){$scope.setCurrMatch($scope.currMatch)}, 500)

  $scope.pitQueue = $cookies.getObject('pitQueue') || []
  $scope.scoutedTeams = $cookies.getObject('scoutedTeams') || {}
  $scope.currTeam = parseInt($cookies.get('currTeam') || '0')
  $timeout(function(){$scope.setCurrTeam($scope.currTeam)}, 500)

  $scope.matchBackup = {}
  $scope.$watch('scout', function(scout) {
    var num = $scope.currMatch

    if(!$scope.matches[num])
      return
    
    scout.match = $scope.matches[num][0]
    scout.teamNumber = $scope.matches[num][1]

    $scope.matchBackup['scout_'+$scope.matches[num][0]] = scout
  }, true)

  $scope.team = {}
  $scope.events = undefined
  $scope.teams = []
  $scope.scout = $scope.getScout()

  $scope.flipField = $cookies.get('flipField') == 'true'
  $scope.toggleField = function() {
    $scope.flipField = !$scope.flipField
    $cookies.put('flipField', $scope.flipField)
    renderTouch()
  }

  $http.get('/events').success(function(resp){
    $scope.events = resp.Events
  })

  $scope.words = []

  $http.get('/words').success(function(resp){
    $scope.words = resp
  })

  $scope.getTeams = function(num) {
    if(!num)
      num = 1
    console.log("Getting page",num)
    $http.get('/api/teams?eventCode='+$scope.eventCode+"&page="+num).success(function(resp){
      if(!resp.teams)
        return
      $scope.teams = $scope.teams.concat(resp.teams)
      resp.teams.forEach(function(team){
        $scope.team[team.teamNumber] = team
      })
      if(resp.pageCurrent < resp.pageTotal)
        $scope.getTeams(parseInt(resp.pageCurrent) + 1)
    })
  }
  if($scope.eventCode)
    $scope.getTeams()


  $scope.setCurrMatch = function(num) {
    num = Math.min($scope.matches.length-1, Math.max(0, num))
    $scope.currMatch = num;
    $scope.scout = $scope.getScout()

    console.log('setting scout match and teamnumber',num,$scope.matches[num])
    $scope.scout.match = $scope.matches[num][0]
    $scope.scout.teamNumber = $scope.matches[num][1]

    $cookies.put('currMatch', num)
    if(!$scope.matches.length || !$scope.scout)
      return

    var list = $('#matchListDiv');
    var next = Math.max(0, num-2)
    list.scrollTop(
      list.scrollTop() + $($('#matchListDiv table tbody').children()[next]).offset().top - list.offset().top
    )
  }

  $scope.setCurrTeam = function(num) {
    num = Math.min($scope.pitQueue.length-1, Math.max(0, num))
    $scope.currTeam = num;
    var team = $scope.pitQueue[num]
    $scope.scout = $scope.getScout()
    $cookies.put('currTeam', num)
  }

  $scope.setTab = function(tab) {
    $scope.currTab = tab;
    $cookies.put('currTab', tab)
    if(tab == 'pit' || tab == 'match')
      $scope.scout = $scope.getScout();
  }

  $scope.getMatches = function() {
    $scope.updating = true
    $scope._eventCode = $scope._eventCode.toLowerCase()
    $http.get('/api/schedule/'+$scope._eventCode+'/qual').
      success(function(resp) {
        $scope.updating = false
        if($scope._eventCode != $scope.eventCode) {
          $scope.clearData(true)
        }

        $scope.matches = resp.Schedule.map(function(obj){
          var team = obj.Teams[0].teamNumber
          for(var i = 0; i < obj.Teams.length; i++) {
            if(obj.Teams[i].station == $scope._scoutSide) {
              team = obj.Teams[i].teamNumber
            }
          }
          return [obj.description.substr(0, 4) + " " + obj.description.split(' ')[1], team]
        });
        $scope.eventCode = $scope._eventCode
        $scope.scoutSide = $scope._scoutSide
        $cookies.put('eventCode', $scope.eventCode)
        $cookies.put('scoutSide', $scope.scoutSide)
        $cookies.putObject('matches', $scope.matches)

        $scope.getTeams()


      }).error(function(err) {
        $scope.notify("Couldn't get match data")
        $scope.updating = false
      })
  }

  $scope.imageClick = function($event) {
    var element = $('#fieldcanvas')
    var zoom = $('body').css('zoom')
    var x = $event.offsetX / zoom / element.width()
    var y = $event.offsetY / zoom / element.height()
    console.log(Math.floor(x*1000)/10, Math.floor(y*1000)/10)
    $scope.clickX = x
    $scope.clickY = y
  }

  $scope.attempt = function(i, val) {
    $scope.scout.tele.defenses[i].push(val)
  }

  $scope.removeAttempt = function(i, pos) {
    if($scope.scout.tele.defenses[i].length <= pos)
      return;
    $scope.scout.tele.defenses[i].splice(pos, 1)
  }

  $scope.lastItems = function(i, num) {
    if($scope.currTab != 'match' || !$scope.scout.tele.defenses)
      return
    var data = $scope.scout.tele.defenses[i]
    var out = {}
    for(var i = Math.max(data.length-num, 0); i < data.length; i++) {
      out[i] = data[i]
    }
    return out
  }


  $scope.addShot = function(goal) {
    if(!$scope.clickX && !$scope.clickY) {
      return;
    }

    if($scope.flipField) {
      $scope.clickX = 1 - $scope.clickX
      $scope.clickY = 1 - $scope.clickY
    }

    $scope.clickX = Math.round(($scope.clickX)*1000)/1000
    $scope.clickY = Math.round(($scope.clickY)*1000)/1000


    $scope.scout.tele.shots.push({
      goal: goal,
      x: $scope.clickX,
      y: $scope.clickY
    })
    renderTouch()
    $scope.clickX = $scope.clickY = undefined
  }

  $scope.removeShot = function(pos) {
    $scope.scout.tele.shots.splice(pos, 1)
  }

  $scope.saveMatch = function(numTries) {
    var data = $scope.scout
    var match = $scope.matches[$scope.currMatch]
    var numTries = numTries || 0
    $cookies.putObject('scout_'+match[0], data)
    $scope.matchBackup['scout_'+match[0]] = data
    $timeout(function(){
      if(!$cookies.getObject('scout_'+match[0])) {
        if(numTries == 0)
          $scope.notify("Couldn't save "+match[0], true)
        if(numTries < 5) {
          $scope.tryClear(numTries)
        }
        else
          $scope.notify('Try again...')
      } else {
        $scope.scoutedMatches[match[0]] = true
        $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
        $scope.notify("Saved "+match[0])
      }
    }, 50)
  }

  $scope.tryClear = function (numTries) {
    var keys = Object.keys($scope.scoutedMatches)
    var key = keys[0];
    for(var i = 0; i < keys.length; i++) {
      if(keys[i] == 's') {
        key = keys[i]
        break;
      }
    }
    $scope.matchBackup[key] = $cookies.getObject('scout_'+key)
    delete $scope.scoutedMatches[key]
    $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
    $cookies.remove('scout_'+key)
    $scope.notify('Removed '+key)
    $scope.saveMatch(numTries+1)
  }

  $scope.clearMatch = function(num) {
    if(!$scope.matches[num])
        return

    var shouldClear = confirm("Clear Scouted Data for " + $scope.matches[num][0] + "?")
    if(shouldClear) {
      $cookies.remove('scout_'+$scope.matches[num][0])
      delete $scope.scoutedMatches[$scope.matches[num][0]];
      $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
      $scope.notify("Cleared "+$scope.matches[num][0])
    }
  }

  $scope.setScouted = function(match, value) {
    $scope.scoutedMatches[match] = value
    $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
  }

  $scope.setScoutedTeam = function(team, value) {
    $scope.scoutedTeams[team] = value
    $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
  }

  $scope.sendMatch = function(match){
    var params = {
      match: match
    }
    var cookie = $cookies.getObject('scout_'+match)
    var backup = $scope.matchBackup['scout_'+match]

    if($scope.scoutedMatches[match] == 's' || (!cookie && !backup))
      return;

    if(backup && !cookie) {
      params.data = backup


    }
    
    $http({
      method: 'POST',
      url: '/match',
      headers: {
        'Content-Type': 'application/json'
      },
      params: params
    }).
      success(function(resp){
        console.log("Successfully sent "+match)
        $scope.scoutedMatches[match] = 's'
        $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
      }).
      error(function(resp){
        $scope.notify("Error in sending "+match)
      })

  }

  $scope.sendData = function() {
    
    Object.keys($scope.scoutedMatches).forEach($scope.sendMatch)

    Object.keys($scope.scoutedTeams).forEach(function(team){
      if($scope.scoutedTeams[team] == 's' || !$scope.scoutedTeams[team])
        return;

      $http({
        method: 'POST',
        url: '/pit',
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          pit: team
        }
      }).
        success(function(resp){
          console.log("Successfully sent "+team)
          $scope.scoutedTeams[team] = 's'
          $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
        }).
        error(function(resp){
          $scope.notify("Error in sending "+team)
        })

    })
  }

  $scope.addQueue = function(num) {
    if($scope.pitQueue.indexOf(num) > -1)
      return;

    if(!num)
      return;

    $scope.pitQueue.push(num)
    $scope.tempTeamNum = ''
    if($('#tempTeamNum')[0])
      $('#tempTeamNum')[0].value = ''
    $cookies.putObject('pitQueue', $scope.pitQueue)
  }

  $scope.removeQueue = function(index) {
    $scope.pitQueue.splice(index, 1)
    $scope.setCurrTeam(index)
    $cookies.putObject('pitQueue', $scope.pitQueue)
  }

  $scope.saveTeam = function() {
    var data = $scope.scout
    var team = data.main.teamNumber
    if(!team)
      return;
    if($scope.pitQueue.indexOf(team) == -1) {
      $scope.addQueue(team)
    }
    $scope.scoutedTeams[team] = true
    $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
    $cookies.putObject('pit_'+team, data)
    $scope.notify("Saved "+team)
  }

  $scope.clearTeam = function(num) {
    if(!$scope.pitQueue[num])
      return

    var shouldClear = confirm("Clear Scouted Data for " + $scope.pitQueue[num] + "?")
    if(shouldClear) {
      $cookies.remove('pit_'+$scope.pitQueue[num])
      delete $scope.scoutedTeams[$scope.pitQueue[num]];
      $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
      $scope.notify("Cleared "+$scope.pitQueue[num])
    }
  }

  $scope.clearData = function(shouldClear) {
    if(!shouldClear)
      shouldClear = confirm('Clear All Data?')
    if(shouldClear) {
      var cookies = $cookies.getAll()
      for(var key in cookies) {
        if(key.startsWith('scout_') || key.startsWith("pit_")) {
          $cookies.remove(key)
        }
      }
      $cookies.remove('scoutedMatches')
      $scope.scoutedMatches = {}
      $cookies.remove('currMatch')
      $scope.currMatch = 0
      $cookies.remove('pitQueue')
      $scope.pitQueue = []
      $cookies.remove('scoutedTeams')
      $scope.scoutedTeams = {}
      $scope.currTeam = 0
      $cookies.remove('currTeam')
    }
  }


  // increase a numeric value by 1
  $scope.inc = function (type) {
    if(!$scope.scout.ball[type])
      $scope.scout.ball[type] = 0
    $scope.scout.ball[type] += 1
  }

  // decrease a numeric value by 1
  $scope.dec = function(type) {
    if(!$scope.scout.ball[type])
      $scope.scout.ball[type] = 0
    $scope.scout.ball[type] -= 1
  }



});

app.directive("drawing", function($cookies){
  return {
    restrict: "A",
    link: function(scope, element){
      var ctx = element[0].getContext('2d');
      console.log(element[0].width,element[0].height,ctx.canvas.width, ctx.canvas.height)
      ctx.canvas.width = 200
      ctx.canvas.height = 200
      // variable that decides if something should be drawn on mousemove
      var drawing = false;

      // the last coordinates before the current move
      var lastX = {};
      var lastY = {};
      scope.path = []
      doodleEnded = false

      function endDoodle() {
        if(!scope.words[scope.currMatch])
          return;
      
        if(!doodleEnded) {
          doodleEnded = true
          scope.notify('Ended doodle of '+(scope.words[scope.currMatch] || 'n/a'))

          console.log('match', $cookies.get('currMatch'))
          $cookies.putObject('doodle_'+scope.words[scope.currMatch], scope.path)
        }
      }

      element.bind('mousedown touchstart', function(event){
        event.preventDefault()
        reset()
        if(event.type.startsWith("touch")) {
          for(var j in event.originalEvent.changedTouches) {
            var touch = event.originalEvent.changedTouches[j]
            var i = touch.identifier
            if(i != 0)
              return
            lastX[i] = touch.pageX
            lastY[i] = touch.pageY
            scope.path = [[
              (lastX[i] - event.currentTarget.offsetLeft)/200,
              (lastY[i] - event.currentTarget.offsetTop)/200]]
            doodleEnded = false
          }
        } else {
          if(event.offsetX!==undefined){
            lastX.m = event.offsetX;
            lastY.m = event.offsetY;
          } else { // Firefox compatibility
            lastX.m = event.layerX - event.currentTarget.offsetLeft;
            lastY.m = event.layerY - event.currentTarget.offsetTop;
          }
          scope.path = [[lastX.m/200, lastY.m/200]]
          doodleEnded = false
          drawing = true;
        }
        $('#data').html('start')


      });
      element.bind('mousemove touchmove', function(event){
        event.preventDefault()
        if(event.type.startsWith("touch")) {
          for(var j in event.originalEvent.changedTouches) {
            var touch = event.originalEvent.changedTouches[j]
            var i = touch.identifier
            if(i != 0)
              return
            if(lastX[i]) {
              var x = event.currentTarget.offsetLeft
              var y = event.currentTarget.offsetTop
              if(scope.path.length < 100) {
                draw(lastX[i]-x, lastY[i]-y, touch.pageX-x, touch.pageY-y)
                scope.path.push([(lastX[i]-x)/200, (lastY[i]-y)/200])
              } else {
                endDoodle()
                
              }
            }
            lastX[i] = touch.pageX
            lastY[i] = touch.pageY

          }
        } else {
          if(drawing){
            // get current mouse position
            if(event.offsetX!==undefined){
              currentX = event.offsetX;
              currentY = event.offsetY;
            } else {
              currentX = event.layerX - event.currentTarget.offsetLeft;
              currentY = event.layerY - event.currentTarget.offsetTop;
            }

            if(scope.path.length < 100) {
              scope.path.push([currentX/200, currentY/200])
              draw(lastX.m, lastY.m, currentX, currentY);
              
            } else {
              endDoodle()
            }

            // set current coordinates to last one
            lastX.m = currentX;
            lastY.m = currentY;
          }    
        }

      });
      element.bind('mouseup touchend', function(event){
        event.preventDefault()
        if(event.type.startsWith("touch")) {
          for(var j in event.originalEvent.changedTouches) {
            var touch = event.originalEvent.changedTouches[j]
            var i = touch.identifier
            if(i != 0)
              return
            
            lastX[i] = 0
            lastY[i] = 0
            endDoodle()

          }
        } else {
          drawing = false;
          endDoodle()

        }
        $('#data').html('end')

      });

      // canvas reset
      function reset(){
       element[0].width = element[0].width; 
      }

      function draw(lX, lY, cX, cY){
        $('#data').html(lX)
        ctx.beginPath();
        // line from
        ctx.moveTo(~~lX,~~lY);
        // to
        ctx.lineTo(~~cX,~~cY);
        // color
        ctx.strokeStyle = "#000";
        // draw it
        ctx.stroke();
      }
    }
  };
});


})();
