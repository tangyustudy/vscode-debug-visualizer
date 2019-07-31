import { Disposable } from "@hediet/std/disposable";
import { debugVisualizerUIContract } from "@hediet/debug-visualizer-vscode-shared";
import { ConsoleRpcLogger } from "@hediet/typed-json-rpc";
import { EvaluationWatcher } from "./DataSource/DataSource";
import { WebSocketStream } from "@hediet/typed-json-rpc-websocket";
import { observable, autorun } from "mobx";
import { Sources } from "./extension";
import { Server } from "./Server";
import * as open from "open";

export class ConnectionHandler {
	public readonly dispose = Disposable.fn();
	@observable
	private watcher: EvaluationWatcher | undefined = undefined;

	constructor(sources: Sources, stream: WebSocketStream, server: Server) {
		const {
			client,
			channel,
		} = debugVisualizerUIContract.registerServerToStream(
			stream,
			new ConsoleRpcLogger(),
			{
				refresh: async () => {
					if (this.watcher) {
						this.watcher.refresh();
					}
				},
				setExpression: async ({ newExpression }) => {
					if (this.watcher) {
						this.dispose.untrack(this.watcher).dispose();
					}
					this.watcher = this.dispose.track(
						sources.jsSource.createEvaluationWatcher(newExpression)
					);
				},
				openInBrowser: async ({}) => {
					open(server.indexUrl);
				},
			}
		);

		this.dispose.track(
			Disposable.create(
				autorun(() => {
					if (this.watcher) {
						client.updateState({
							newState: this.watcher.state,
						});
					}
				})
			)
		);

		stream.onClosed.then(() => {
			this.dispose();
		});
	}
}