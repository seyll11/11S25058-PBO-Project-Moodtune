package id.moodtune.usecase.port;

import java.util.function.Supplier;

public interface TransactionBoundary {
    <T> T execute(Supplier<T> operation);
    void execute(Runnable operation);
}
