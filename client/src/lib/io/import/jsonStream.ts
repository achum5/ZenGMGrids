// client/src/lib/io/import/jsonStream.ts
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamArray } from 'stream-json/streamers/StreamArray';

interface ParserOptions {
  onMetaData: (meta: any) => void;
  onPlayer: (player: any) => void;
  onTeam: (team: any) => void;
  onComplete: () => void;
}

export function createJsonParsingStream(options: ParserOptions): WritableStream<string> {
  const metaData: any = {};
  let metaDataSent = false;

  const pipeline = chain([
    parser(),
    (data) => {
      // Capture top-level metadata
      if (data.stack.length === 1 && data.key !== 'players' && data.key !== 'teams') {
        metaData[data.key] = data.value;
      }
      return data;
    },
    pick({ filter: 'players' }),
    streamArray(),
    (data) => {
      if (!metaDataSent) {
        options.onMetaData(metaData);
        metaDataSent = true;
      }
      return data.value;
    }
  ]);

  pipeline.on('data', (player) => {
    options.onPlayer(player);
  });

  const teamsPipeline = chain([
    parser(),
    pick({ filter: 'teams' }),
    streamArray(),
    (data) => data.value
  ]);

  teamsPipeline.on('data', (team) => {
    options.onTeam(team);
  });
  
  pipeline.on('end', () => {
    // This will be called after players are done.
    // We need a way to know when both are done.
  });

  const writable = new WritableStream({
    write(chunk) {
      pipeline.write(chunk);
      teamsPipeline.write(chunk);
    },
    close() {
      pipeline.end();
      teamsPipeline.end();
      // A bit of a hack, but we assume both pipelines finish roughly together
      setTimeout(() => {
        if (!metaDataSent) {
          options.onMetaData(metaData);
        }
        options.onComplete();
      }, 500);
    },
  });

  return writable;
}
