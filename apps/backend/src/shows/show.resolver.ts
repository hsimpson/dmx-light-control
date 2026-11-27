import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import { AddShowInput, DeleteShowPayload, ShowDto, UpdateShowInput } from './dto/show.dto';
import { ShowService } from './show.service';

@Resolver()
export class ShowResolver {
  public constructor(private readonly showService: ShowService) {}

  @Query(() => [ShowDto], { name: 'shows', description: 'get all shows of a project, ordered by name' })
  public async getShows(
    @Args('projectPublicId', { type: () => GraphQLUUID }) projectPublicId: string,
  ): Promise<ShowDto[]> {
    return plainToInstance(ShowDto, await this.showService.listShows(projectPublicId));
  }

  @Mutation(() => ShowDto, { name: 'addShow', description: 'add an empty show to a project' })
  public async addShow(@Args('input') input: AddShowInput): Promise<ShowDto> {
    return plainToInstance(ShowDto, await this.showService.addShow(input));
  }

  @Mutation(() => ShowDto, {
    name: 'updateShow',
    description: 'rename a show, replace its light tracks and move its audio clips',
  })
  public async updateShow(@Args('input') input: UpdateShowInput): Promise<ShowDto> {
    return plainToInstance(ShowDto, await this.showService.updateShow(input));
  }

  @Mutation(() => DeleteShowPayload, { name: 'deleteShow', description: 'delete a show and its audio files' })
  public async deleteShow(@Args('publicId', { type: () => GraphQLUUID }) publicId: string): Promise<DeleteShowPayload> {
    return plainToInstance(DeleteShowPayload, await this.showService.deleteShow(publicId));
  }
}
