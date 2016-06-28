require 'sinatra'
require 'sinatra/cookies'
require 'open-uri'
require 'json'
require 'uri'

#THE STAGING SERVER IS AVAILABLE AT: https://frc-staging-api.firstinspires.org
#THE PRODUCTION SERVER IS AVAILABLE AT: https://frc-api.firstinspires.org
$server = 'https://frc-api.firstinspires.org/v2.0/'+Time.now.year.to_s+'/'

$token = open('frcapi').read
$dict = open('dictionary.txt').read.split("\n").shuffle

set :bind, '0.0.0.0'
set :port, 8080

Dir.mkdir 'public/data' unless File.exists? 'public/data'

def api(path)
  begin
    open("#{$server}#{path}",
      "User-Agent" => "https://github.com/2468scout/quickscout",
      "Authorization" => "Basic #{$token}",
      "accept" => "application/json"
    ).read
  rescue
    return '{}'
  end
end

$requests = {}

$caching = true

get '/toggleCaching' do
  $caching = !$caching
  $startTime = Time.now.to_f
  $caching ? "Enabled" : "Disabled"
end

get %r{^\/api\/.*$} do
  begin
    req = request.path[5..-1]+"?"+params.to_a.map{|p|p*?=}*?&
    content_type :json
    puts req
    if $requests[req] && ($requests[req][:time] + 60 > Time.now.to_f) 
      $requests[req][:data]
    else
      $requests[req] = {
        data: api(req),
        time: Time.now.to_f
      }
      $requests[req][:data]
    end
  rescue
    status 404
  end
end

$events = api('events/')

get '/events' do
  content_type :json
  $events
end

get '/scout' do
  erb :scout
end

get '/words' do
  return $dict[0...100].to_json
end

post '/match' do
  begin
    if params[:data]
      data = JSON.parse(params[:data])
      match = data['match']
    else
      data = JSON.parse(cookies["scout_"+params[:match].to_s] || '')
      match = params[:match].to_s
    end
    puts "DATA",data
    open('public/data/'+match+"_"+data['teamNumber'].to_s+".json",'w'){|f|
      f << data.to_json
    }
    '{"msg":"Success"}'
    status 200
  rescue => e
    puts e, $!.backtrace
    status 400
  end

end

post '/pit' do
  begin
    data = JSON.parse(cookies["pit_"+params[:pit].to_s] || '')
    open('public/data/pit_'+data['main']['teamNumber'].to_s+".json",'w'){|f|
      f << cookies["pit_"+params[:pit].to_s]
    }
    '{"msg":"Success"}'
    status 200
  rescue => e
    puts e
    status 400
  end

end

before do
  if File.exist?('debug') || !params[:update].nil?
    headers 'Cache-Control' => 'no-cache, must-revalidate'
  end
end

get '/' do
  erb :stats
end

$lastNum = 0
$lastData = "{}"

get '/data' do
  output = {}
  if Dir["public/data/*"].length == $lastNum
    $lastData
  else
    Dir["public/data/*"].each{|path|
      begin
        output[path[/\/data\/.*$/]] = JSON.parse(open(path).read)
      rescue => e
        puts "ERROR: #{e}"
      end
    }
    $lastData = output.to_json
    output.to_json
  end
end


$startTime = Time.now.to_f

get '/stats.appcache' do
  headers['Content-Type'] = 'text/cache-manifest'
  unless $caching
    """CACHE MANIFEST # #{Time.now.to_f.floor}
NETWORK:
*
    """
  else
  """CACHE MANIFEST # Started: #{$startTime}
CACHE:
/angular-material.min.css
/icons.woff2
/icons.css
/angular.js
/angular-route.min.js
/angular-cookies.min.js
/angular-animate.min.js
/angular-aria.min.js
/angular-messages.min.js
/angular-material.min.js
/halffield.png
/
/stats/app.js
/stats/style.css
/stats/_overview.html
/stats/_defenses.html
/stats/_shots.html
/stats/_team.html
/stats/_threeteams.html
/stats/_averages.html

FALLBACK:
# Scouted Data
/data /data # #{Dir["public/data/*"].length} files
/api/schedule/#{cookies['eventCode']}/qual /api/schedule/#{cookies['eventCode']}/qual

# Event Code (Changes with cookies)
/api/scores/#{cookies['eventCode']}/qual /api/scores/#{cookies['eventCode']}/qual

NETWORK:
/api/teams
*
"""
  end
end

get '/scout/scout.appcache' do
  headers['Content-Type'] = 'text/cache-manifest'
  unless $caching
    """CACHE MANIFEST # #{Time.now.to_f.floor}
NETWORK:
*
    """
  else
  """CACHE MANIFEST # Started: #{$startTime}
CACHE:
/jquery.min.js
/angular.min.js
/angular-route.min.js
/angular-cookies.min.js
/halffield.png
/halffield2.png
/scout/app.js
/scout/style.css
/scout
/scout/tab_pit.html
/scout/tab_match.html
/scout/tab_data.html
/scout/tab_events.html
/scout/tab_teams.html
/scout/tab_doodle.html
/events
/words

FALLBACK:
/scout/_online.html /scout/_offline.html
/api/schedule/#{cookies['eventCode']}/qual /api/schedule/#{cookies['eventCode']}/qual

NETWORK:
/match
/api/teams
/pit
*

"""
  end
end