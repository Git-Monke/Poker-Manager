"use client";

import { useState, useEffect, useCallback } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spade } from "lucide-react";

import AddPlayer, { AddPlayerData } from "./components/addplayer";
import ChangeBlinds from "./components/changeblinds";
import { NormalizeError } from "next/dist/shared/lib/utils";
import { renderToStaticNodeStream } from "react-dom/server";

type Player = {
  name: string;
  stack: number;
  feld: boolean;
  selected: boolean;
  currentAmountBet: number;
  allIn: boolean;
};

type PlayerTable = Record<string, Player>;

const numericalWords = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

function toCurrencyString(num: number) {
  return "$" + num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

export default function Home() {
  let [pot, setPot] = useState(0);
  let [smallBlind, setSmallBlind] = useState(1);
  let [bigBlind, setBigBlind] = useState(2);
  let [players, setPlayers] = useState<PlayerTable>({});
  // players is a dictionary storing the player data. This stores the names of the players in order (used for determining whose turn it is)
  let [turnOrder, setTurnOrder] = useState<string[]>([]);
  let [dealerIndex, setDealerIndex] = useState(0);
  let [turn, setTurn] = useState(0);
  let [round, setRound] = useState(1);
  let [minRaise, setMinRaise] = useState(smallBlind);
  let [amountToCall, setAmountToCall] = useState(0);

  let [allIn, setAllIn] = useState(false);
  let [effAllInSize, setAllInSize] = useState(0);

  const [firstTurn, setFirstTurn] = useState(true);
  const [amountToRaise, setAmountToRaise] = useState(0);

  const [shouldRotateTurn, setShouldRotateTurn] = useState(false);

  useEffect(() => {
    if (shouldRotateTurn) {
      rotateTurn();
    }

    setShouldRotateTurn(false);
  }, [shouldRotateTurn]);

  const numPlayersStillIn = turnOrder.reduce(
    (sum, name) => sum + (players[name].feld ? 0 : 1),
    0
  );

  const anyPlayerSelected = turnOrder.some(
    (playerName) => players[playerName].selected
  );

  // useEffect(() => {
  //   setPlayers({
  //     Jacob: {
  //       name: "Jacob",
  //       stack: 100000,
  //       feld: false,
  //       selected: false,
  //       currentAmountBet: 0,
  //     },
  //     Ben: {
  //       name: "Ben",
  //       stack: 100000,
  //       feld: false,
  //       selected: false,
  //       currentAmountBet: 0,
  //     },
  //   });
  //   setTurnOrder(["Jacob", "Ben"]);
  // }, []);

  const calculateSplit = (amount: number, players: number) => {
    let reward = Math.floor((amount / players) * 100) / 100;
    let change = Math.round((amount - reward * players) * 100) / 100;
    return { reward, change };
  };

  const awardPot = useCallback(() => {
    let numSelectedPlayers = Object.keys(players).reduce(
      (p, c) => (players[c].selected ? p + 1 : p),
      0
    );
    let { reward, change } = calculateSplit(pot, numSelectedPlayers);
    let newPlayers = { ...players };
    for (let [_, player] of Object.entries(players)) {
      if (player.selected) {
        player.stack += reward;
      }
      player.selected = false;
      player.feld = false;
      player.currentAmountBet = 0;
    }
    setPlayers(newPlayers);
    setPot(change);
    setRound(1);
    setDealerIndex((dealerIndex + 1) % turnOrder.length);
    setTurn((dealerIndex + 1) % turnOrder.length);
    setAmountToCall(0);
    setMinRaise(smallBlind);
    setAllIn(false);
  }, [players, pot, dealerIndex, smallBlind]);

  const togglePlayer = useCallback((playerName: string) => {
    setPlayers((prevPlayers) => {
      const player = prevPlayers[playerName];
      const updatedPlayer = { ...player, selected: !player.selected };
      return { ...prevPlayers, [playerName]: updatedPlayer };
    });
  }, []);

  const addPlayer = useCallback((data: AddPlayerData) => {
    const player = {
      name: data.name,
      stack: data.buyin,
      feld: false,
      selected: false,
      currentAmountBet: 0,
      allIn: false,
    };

    setPlayers((prevPlayers) => {
      return { ...prevPlayers, [data.name]: player };
    });

    setTurnOrder((prevTurnOrder) => {
      return [...prevTurnOrder, data.name];
    });
  }, []);

  const rotateTurn = () => {
    let next = turn;
    let wentPastFirstPlayer = false;

    do {
      next = (next + 1) % turnOrder.length;
      if (next === dealerIndex + 2) {
        wentPastFirstPlayer = true;
      }
    } while (players[turnOrder[next]].feld);

    const allPlayersHaveCalled = !turnOrder.some(
      (playerName) =>
        players[playerName].currentAmountBet !== amountToCall &&
        !players[playerName].feld
    );

    const allPlayersBet =
      !firstTurn &&
      ((amountToCall > 0 && allPlayersHaveCalled) ||
        (amountToCall === 0 && wentPastFirstPlayer));

    if (allPlayersBet && !(round === 1 && turn === dealerIndex && !firstTurn)) {
      setRound(round + 1);

      let targetNextTurn = (dealerIndex + 2) % turnOrder.length;
      while (players[turnOrder[targetNextTurn]].feld) {
        targetNextTurn = (targetNextTurn + 1) % turnOrder.length;
      }

      setTurn(targetNextTurn);
      setMinRaise(bigBlind);
      setAmountToCall(0);
      setFirstTurn(true);

      let newPlayers = { ...players };
      let potIncrease = 0;
      for (let [key, _] of Object.entries(newPlayers)) {
        potIncrease += newPlayers[key].currentAmountBet;
        newPlayers[key].stack -= newPlayers[key].currentAmountBet;
        newPlayers[key].currentAmountBet = 0;
      }

      setPlayers(newPlayers);
      setPot(pot + potIncrease);

      return;
    }

    setTurn(next);
    setFirstTurn(false);
  };

  const raise = useCallback(
    (playerName: string, amount: number) => {
      if (amount < minRaise) {
        return;
      }

      const player = players[playerName];

      if (!player) {
        return;
      }

      if (player.stack < amountToCall - player.currentAmountBet + amount) {
        return;
      }

      if (minRaise < amount) {
        setMinRaise(amount);
      }

      const pay = amountToCall - player.currentAmountBet + amount;

      // setPot(pot + pay);

      let newPlayers = { ...players };

      setAmountToCall(amountToCall + amount);

      newPlayers[playerName].currentAmountBet =
        newPlayers[playerName].currentAmountBet + pay;
      setPlayers(newPlayers);
      setShouldRotateTurn(true);
    },
    [players, minRaise, bigBlind, amountToCall, pot, turn, dealerIndex]
  );

  const call = useCallback(
    (playerName: string) => {
      let newPlayers = { ...players };
      let caller = newPlayers[playerName];
      caller.currentAmountBet = amountToCall;
      setPlayers(newPlayers);
      setShouldRotateTurn(true);
    },
    [players]
  );

  const fold = useCallback(
    (playerName: string) => {
      let newPlayers = { ...players };
      newPlayers[playerName].feld = true;
      setPlayers(newPlayers);
      rotateTurn();
    },
    [players]
  );

  const getOptions = useCallback(
    (playerName: string, position: number) => {
      let options = {
        fold: false,
        raise: false,
        allin: false,
        call: false,
        check: false,
        smallblind: false,
        bigblind: false,
      };

      if (position !== turn) {
        return options;
      }

      if (amountToCall === 0 && turn === dealerIndex && round == 1) {
        options.smallblind = true;
        return options;
      }

      if (
        amountToCall === smallBlind &&
        turn === (dealerIndex + 1) % turnOrder.length &&
        round == 1
      ) {
        options.bigblind = true;
        return options;
      }

      options.fold = true;
      const player = players[playerName];

      if (allIn) {
        options.allin = true;
        return options;
      }

      if (
        amountToCall === 0 ||
        (amountToCall > 0 && player.currentAmountBet === amountToCall)
      ) {
        options.check = true;
      }

      if (
        amountToCall > 0 &&
        amountToCall < player.stack &&
        player.currentAmountBet !== amountToCall
      ) {
        options.call = true;
      }

      if (player.stack >= amountToCall - player.currentAmountBet + minRaise) {
        options.raise = true;
      }

      options.allin = true;

      return options;
    },
    [turn, players, amountToCall, dealerIndex, turnOrder]
  );

  const goAllIn = useCallback(
    (playerName: string) => {
      players[playerName].allIn = true;
      let newPlayers = { ...players };
      newPlayers[playerName].allIn = true;
      setPlayers(newPlayers);

      if (effAllInSize > players[playerName].stack) {
        setAllInSize(newPlayers[playerName].stack);
      }

      setAllIn(true);
    },
    [players, allIn]
  );

  return (
    <main className="flex flex-col items-center">
      <nav className="p-5 bg-primary w-full flex justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-background">Poker Manager</h1>
          <Spade className="text-background w-8 h-8 rotate-45 "></Spade>
        </div>
        <div className="flex gap-8">
          <AddPlayer onSubmit={addPlayer} existingPlayers={turnOrder} />
          <ChangeBlinds />
          <Button className="p-0 text-sm font-semibold">Reset</Button>
        </div>
      </nav>

      <Card className="p-8 flex flex-col items-center gap-4 m-8 w-3/4">
        <h1 className="font-normal text-5xl">Pot</h1>
        <h1 className="4xl">{toCurrencyString(pot)}</h1>
        <Card className="flex flex-col gap-4 p-8 w-full">
          <h2>
            {numericalWords[numPlayersStillIn] +
              " Player" +
              (numPlayersStillIn !== 1 ? "s" : "")}
          </h2>
          <div className="flex justify-between gap-4">
            {turnOrder.map((player, i) => {
              return !players[player].feld ? (
                <Button
                  key={"button" + i}
                  className="w-full"
                  variant={!players[player].selected ? "outline" : "default"}
                  onClick={() => togglePlayer(player)}
                >
                  {player}
                </Button>
              ) : undefined;
            })}
          </div>

          {anyPlayerSelected ? (
            <Button variant="secondary" onClick={() => awardPot()}>
              Award Pot
            </Button>
          ) : undefined}
        </Card>

        <p>
          {toCurrencyString(smallBlind)} / {toCurrencyString(bigBlind)} Blinds
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-3/4">
        {turnOrder.map((playerName, i) => {
          const options = getOptions(playerName, i);
          const player = players[playerName];

          return (
            <Card
              className={
                "p-8 flex flex-col gap-4 " +
                (i !== turn ? "opacity-50" : "") +
                (player.feld ? " bg-gray-300" : "") +
                (player.allIn ? " border-red-400" : "")
              }
              key={"player" + i}
            >
              <div className="flex justify-between">
                <h1>{playerName}</h1>
                <Button variant="destructive" className="w-4 h-4 text-xs">
                  X
                </Button>
              </div>
              <h2>Stack: {toCurrencyString(player.stack)}</h2>

              {!player.allIn && player.currentAmountBet > 0 ? (
                <p>{toCurrencyString(player.currentAmountBet)} Bet</p>
              ) : undefined}

              {!player.allIn && i === turn ? (
                <p>
                  {toCurrencyString(amountToCall - player.currentAmountBet)} to
                  call, {toCurrencyString(minRaise)} minimum raise
                </p>
              ) : undefined}

              {player.allIn ? (
                <p>All in for {toCurrencyString(effAllInSize)} effective</p>
              ) : undefined}

              {/* Small Blind */}
              {options.smallblind ? (
                <>
                  <Button onClick={() => raise(playerName, smallBlind)}>
                    Pay Small Blind
                  </Button>
                </>
              ) : undefined}

              {/* Big Blind */}
              {options.bigblind ? (
                <>
                  <Button
                    onClick={() => raise(playerName, bigBlind - smallBlind)}
                  >
                    Pay Big Blind
                  </Button>
                </>
              ) : undefined}

              {options.check ? (
                <Button
                  onClick={() => {
                    rotateTurn();
                  }}
                >
                  Check
                </Button>
              ) : undefined}
              {options.call ? (
                <Button
                  onClick={() => {
                    call(playerName);
                  }}
                >
                  Call
                </Button>
              ) : undefined}
              {options.raise ? (
                <div className="flex">
                  <Button
                    className="rounded-tr-none rounded-br-none"
                    onClick={() => raise(playerName, amountToRaise)}
                  >
                    Raise
                  </Button>
                  <Input
                    type="number"
                    className="border border-gray rounded-tl-none rounded-bl-none"
                    onChange={(event) =>
                      setAmountToRaise(parseFloat(event.target.value))
                    }
                  ></Input>
                </div>
              ) : undefined}
              {options.allin ? (
                <Button
                  onClick={() => {
                    goAllIn(playerName);
                  }}
                >
                  All In
                </Button>
              ) : undefined}
              {options.fold ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    fold(playerName);
                  }}
                >
                  Fold
                </Button>
              ) : undefined}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
