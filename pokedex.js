   // This is the js file that descirbe the layout and view of Pokedex and pokecard

(function() {
    'use strict';

    // aliases for common DOM functions
    var $ = function(id) { return document.getElementById(id); };
    var qs = function(sel) { return document.querySelector(sel); };
    var qsa = function(sel) { return document.querySelectorAll(sel); };
    var base = "https://webster.cs.washington.edu/pokedex/";
    var foundPokemon = ["Bulbasaur", "Charmander", "Squirtle"]; //Store all the known pokemon
    var gameID;
    var playerID;

    window.onload = function() {
        fetchPokemon();
    };

    // fetch all pokemon imgs from server and apend click handler to the known pokemon
    function fetchPokemon() {
        var pokemonPromise = new AjaxGetPromise(base + "pokedex.php?pokedex=all");
        pokemonPromise
                .then(appendPokemon)
                .catch(function(errorMsg) { alert( "ERROR: " + errorMsg ); } );
    }

    // fetch one pokemon from serve and put its image in the pokedex with
    // its other information
    // Append clicker handler if this pokemon is known
    // Known pokemon will be displayed with its original images and can be clicked
    // Unknown pokemon will be displayed in black and can not be clicked
    function appendPokemon(responseText) {
        var pokemonArray = responseText.split("\n");
        for (var i = 0; i < pokemonArray.length; i++) {
            var img = document.createElement("img");
            var pokemon = pokemonArray[i].split(":");
            var pokemonName = pokemon[0];
            var pokemonSrc = pokemon[1];
            img.src = base + "sprites/" + pokemonSrc;
            img.alt = pokemonName;
            img.classList.add("sprite");
            img.id = pokemonName;
            if (contains(pokemonName)) {
               img.onclick = fetchData;
            } else {
               img.classList.add('unfound');
            }
            $("pokedex-view").appendChild(img);
        }
    }

    // Check if one pokemon belongs to known pokemon
    // Return true if it is known, otherwise false
    function contains(pokemonName) {
      for (var i = 0; i < foundPokemon.length; i++) {
         if (foundPokemon[i] == pokemonName) {
            return true;
         }
      }
      return false;
    }

    // fetch Data about this pokemon and append these data to pokeCard
    function fetchData() {
      var url = base + "pokedex.php?pokemon=" + this.id;
      var pokemonDataPromise = new AjaxGetPromise(url);
      pokemonDataPromise
                        .then(JSON.parse)
                        .then(appendDataCardView)
                        .catch(function(errorMsg) { alert( "ERROR: " + errorMsg ); } );
    }

    // append data to pokeCard
    // Show "Choose these Pokemon" button and append event handler
    // that start the battle when click
    function appendDataCardView(dataArray) {
      $("my-card").querySelector("#start-btn").classList.remove("hidden");
      $("my-card").querySelector("#start-btn").onclick = battleMode;
      appendData(dataArray, "my-card");
    }

    // Append data to pokeCard
    function appendData(dataArray, id) {
      var qs = function(sel) { return $(id).querySelector(sel); };
      qs(".name").innerHTML = dataArray.name;
      qs(".hp").innerHTML = dataArray.hp + "HP";
      qs(".info").innerHTML = dataArray.info.description;
      qs(".pokepic").setAttribute("src", base + dataArray.images.photo);
      qs(".type").setAttribute("src", base + dataArray.images.typeIcon);
      qs(".weakness").setAttribute("src", base + dataArray.images.weaknessIcon);

      var qsa = function(sel) { return $(id).querySelector(".moves").querySelectorAll(sel);};
      var moveButtons = qsa("button");
      for (var i = 0; i < dataArray.moves.length; i++) {
         moveButtons[i].classList.remove('hidden');
         moveButtons[i].querySelector(".move").innerHTML = dataArray.moves[i].name;
         if (typeof dataArray.moves[i].dp != 'undefined') {
            moveButtons[i].querySelector(".dp").innerHTML = dataArray.moves[i].dp + " DP";
         } else {
            moveButtons[i].querySelector(".dp").innerHTML = "";
         }
         moveButtons[i].querySelector("img").setAttribute("src", base + "icons/" +
                                                         dataArray.moves[i].type + ".jpg");
      }

      for (var j = dataArray.moves.length; j < 4; j++) {
         moveButtons[i].classList.add('hidden');
      }
    }

    // Change pagepage to battleMode and start the game
    // Fetch data of itial game state and append them
    function battleMode() {
      $("title").innerHTML = "Pokemon Battle Mode!";
      $("pokedex-view").classList.add('hidden');
      $("my-card").querySelector(".hp-info").classList.remove('hidden');
      $("their-card").classList.remove('hidden');
      $("start-btn").classList.add('hidden');
      $("flee-btn").classList.remove('hidden');
      $("flee-btn").onclick = flee;
      $("results-container").classList.remove('hidden');

      var postParam = { "startgame" : "true",
                        "mypokemon" : $("my-card").querySelector(".name").innerHTML};
      var gameDataPromise = new AjaxPostPromise(base + "game.php", postParam);
      gameDataPromise
                     .then(JSON.parse)
                     .then(startGame)
                     .catch(function(errorMsg) { alert( "ERROR: " + errorMsg ); } );
   }

   // Event handler on "Flee the game" for flee option
   // When flee, the game is lost right away
   function flee() {
      var postParams = {"move":"flee", "guid":gameID, "pid":playerID};
      var fleePromise = new AjaxPostPromise(base + "game.php", postParams);
      fleePromise
               .then(JSON.parse)
               .then(updateGame)
               .catch(function(errorMsg) { alert( "ERROR: " + errorMsg ); } );
   }

   // Start the game by appending information on client's card and opponent's card
   function startGame(dataArray) {
      // Append game hander to attacks
      for (var i = 0; i < $("my-card").querySelector(".moves")
                                      .querySelectorAll("button").length; i++) {

         if (!$("my-card").querySelector(".moves")
                          .querySelectorAll("button")[i]
                          .classList.contains('hidden')) {

            $("my-card").querySelector(".moves")
                        .querySelectorAll("button")[i].onclick = gameHandler;
         }
      }
      appendData(dataArray.p1, "my-card");
      appendData(dataArray.p2, "their-card");
      appendBuff("my-card", dataArray.p1);
      appendBuff("their-card", dataArray.p2);

      displayBuff("my-card");
      displayBuff("their-card");
      gameID = dataArray.guid;
      playerID = dataArray.pid;
   }

   // Display all the buff and debuff for current Pokemon
   // Attack buffs .attack are represented as red arrows, defense buffs
   // .defense are represented as blue arrows, and accuracy buffs
   // .accuracy are represented as green arrows.
   // Helpful buffs are arrows pointed upwards (with the .buff class) and
   // harmful buffs are arrows pointed downwards (with the .debuff class).
   function displayBuff(card) {
      $(card).querySelector(".buffs").classList.remove("hidden");
   }

   // Get game state updates from server and call updateGame to append changes to cards
   function gameHandler() {
      $("loading").classList.remove("hidden");
      var movename = this.querySelector(".move").innerHTML.replace(/\s/g,'').toLowerCase();
      var postParams = { "guid" : gameID, "pid" : playerID, "movename" : movename};
      var gameChangePromise = new AjaxPostPromise(base + "game.php", postParams);
      gameChangePromise
                     .then(JSON.parse)
                     .then(updateGame)
                     .catch(function(errorMsg) { alert( "ERROR: " + errorMsg ); } );
   }

   // Append updated game state to both client's card and opponent's card
   // Stop the game if either two cards has HP = 0
   // If the last game is won, the defeated pokemon is known and can be clicked
   function updateGame(dataArray) {
      updateHpBar("my-card", updateHP(dataArray.p1));
      updateHpBar("their-card", updateHP(dataArray.p2));

      $("loading").classList.add("hidden");
      $("p1-turn-results").classList.remove("hidden");
      $("p2-turn-results").classList.remove("hidden");
      if (dataArray.results["p2-move"] == "") {
         $("p2-turn-results").classList.add("hidden");
      }
      $("p1-turn-results").innerHTML = "Play 1 played " +
                                       dataArray.results["p1-move"] + " and " +
                                       checkHit(dataArray.results["p1-result"]);
      $("p2-turn-results").innerHTML = "Play 2 played " + dataArray.results["p2-move"] + " and " +
                                       checkHit(dataArray.results["p2-result"]);

      appendData(dataArray.p1, "my-card");
      appendData(dataArray.p2, "their-card");

      appendBuff("my-card", dataArray.p1);
      appendBuff("their-card", dataArray.p2);

      if (dataArray.p1["current-hp"] == 0) {
         finishGame(false);
      } else if (dataArray.p2["current-hp"] == 0) {
         foundPokemon.push(dataArray.p2.name);

         $("pokedex-view").querySelector("#" + dataArray.p2.name).classList.remove("unfound");
         $("pokedex-view").querySelector("#" + dataArray.p2.name).onclick = fetchData;
         finishGame(true);
      }
   }

   // Check if the attack hit or not
   // Return "hit!" if the attck hits
   // Otherwise return "miss!"
   function checkHit(result) {
      if (result == "hit") {
         return "hit!";
      } else {
         return "miss!";
      }
   }

   // Retune the updated HP percenrtage of pass-in pokemon
   function updateHP(data) {
      var percentage = (data["current-hp"] / data.hp) * 100;
      return percentage;
   }

   // Change the length of HP bar base on the current HP pass-in pokemon
   // Change the HP bar color to red if this pokemon's HP is less than 20%
   // of its original HP
   function updateHpBar(id, percentage) {
      if (percentage <= 20) {
         $(id).querySelector(".health-bar").style.backgroundColor = "red";
      }
      $(id).querySelector(".health-bar").style.width = percentage + "%";
   }

   // Update pokemon's buff by deleting all the old buff and add new buff
   function appendBuff(id, data) {
      removeBuff(id);

      for (var i = 0; i < data.buffs.length; i++) {
         var buff = document.createElement("div");
         buff.classList.add("buff");
         buff.classList.add(data.buffs[i]);
         $(id).querySelector(".buffs").appendChild(buff);
      }

      for (var i = 0; i < data.debuffs.length; i++) {
         var deBuff = document.createElement("div");
         deBuff.classList.add("debuff");
         deBuff.classList.add(data.debuffs[i]);
         $(id).querySelector(".buffs").appendChild(deBuff);
      }
   }

   // Show button that direct back to Pokedex page when game is complete
   // Make client's card buttons unclickable
   function finishGame(win) {
      if (win) {
         $("title").innerHTML = "You won!";
      } else {
         $("title").innerHTML = "You lost!";
      }
      $("endgame").classList.remove("hidden");
      $("endgame").onclick = backToPokedex;
      removeOnClick();
   }

   // Display pokedex view with latest choosen pokemon in the card view
   // If the last game is won, the defeated pokemon is known and can be clicked
   function backToPokedex() {
      $("endgame").classList.add("hidden");
      $("pokedex-view").classList.remove('hidden');
      $("their-card").classList.add('hidden');
      $("start-btn").classList.remove('hidden');
      $("flee-btn").classList.add('hidden');
      $("results-container").classList.add('hidden');
      $("p1-turn-results").innerHTML="";
      $("p2-turn-results").innerHTML="";

      $("title").innerHTML = "Your Pokedex";
      qs(".hp-info").classList.add('hidden');
      for (var i = 0; i < qsa(".health-bar").length; i++) {
         qsa(".health-bar")[i].style.backgroundColor = "green";
         qsa(".health-bar")[i].style.width = "100%";
      }
      removeBuff("my-card");
      removeOnClick();
   }

   // Make client's card buttons unclickable
   function removeOnClick() {
      var myCardButton = $("my-card").querySelector(".moves").querySelectorAll("button");
      for (var i = 0; i < myCardButton.length; i++) {
         myCardButton[i].onclick = "";
         $("flee-btn").onclick = "";
      }
   }

   // Remove all the existing buffs in current Pokemon
   function removeBuff(id) {
      while ($(id).querySelector(".buffs").hasChildNodes()) {
         $(id).querySelector(".buffs").removeChild($(id).querySelector(".buffs").lastChild);
      }
   }
})();
